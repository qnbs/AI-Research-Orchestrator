import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ResearchInput, Settings } from '../types';
import * as safeLog from '../lib/safeLog';
import { EXECUTION_PROVENANCE_PHASE } from '../lib/researchExecutionContext';
import {
  generateAuthorQuery,
  parseGeminiResponseJson,
  resetAIInstance,
  findSimilarArticles,
  generateResearchAnalysis,
  generateResearchReportStream,
  generateTldrSummary,
  findRelatedOnline,
  startChatWithReport,
  disambiguateAuthor,
  suggestAuthors,
  analyzeSingleArticle,
  generateJournalProfileAnalysis,
} from './geminiService';
import {
  selectArticlesForRankingPrompt,
  selectArticlesForSynthesisPrompt,
} from '../lib/promptBudget';
import { invalidateOllamaHealthCache } from './providers/ollamaHealth';
import { invalidateOllamaModelMetadataCache } from '../lib/ollamaModelMetadata';
import {
  OLLAMA_OUTPUT_TOKEN_RESERVE,
  OLLAMA_BUDGET_SAFETY_MARGIN,
} from '../lib/ollamaContextBudget';

const hoisted = vi.hoisted(() => ({
  generateContent: vi.fn(),
  generateContentStream: vi.fn(),
}));

vi.mock('@google/genai', () => ({
  // Vitest 4: mocks used with `new` must be function/class, not arrow implementations.
  GoogleGenAI: vi.fn().mockImplementation(function MockGoogleGenAI(this: {
    models: {
      generateContent: typeof hoisted.generateContent;
      generateContentStream: typeof hoisted.generateContentStream;
    };
    chats: { create: ReturnType<typeof vi.fn> };
  }) {
    this.models = {
      generateContent: hoisted.generateContent,
      generateContentStream: hoisted.generateContentStream,
    };
    this.chats = {
      create: vi.fn(() => ({
        sendMessageStream: vi.fn(async function* () {
          yield { text: 'reply' };
        }),
      })),
    };
  }),
  Type: { OBJECT: 'OBJECT', ARRAY: 'ARRAY', STRING: 'STRING', INTEGER: 'INTEGER' },
}));

vi.mock('./apiKeyService', () => ({
  getApiKey: vi.fn().mockResolvedValue('test-api-key'),
  getProviderApiKey: vi.fn().mockResolvedValue('test-api-key'),
  hasApiKey: vi.fn().mockResolvedValue(true),
  hasProviderApiKey: vi.fn().mockResolvedValue(true),
  getNcbiApiKey: vi.fn().mockResolvedValue('ncbi-vault-key'),
}));

const mockPubMed = vi.hoisted(() => ({
  searchPubMedForIds: vi.fn(),
  fetchArticleDetails: vi.fn(),
}));

vi.mock('./pubmedUtils', () => ({
  searchPubMedForIds: (...args: unknown[]) => mockPubMed.searchPubMedForIds(...args),
  fetchArticleDetails: (...args: unknown[]) => mockPubMed.fetchArticleDetails(...args),
}));

vi.mock('./arxivUtils', () => ({
  searchAndFetchArxiv: vi.fn().mockResolvedValue([]),
}));

vi.mock('../lib/promptBudget', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/promptBudget')>();
  return {
    ...actual,
    selectArticlesForRankingPrompt: vi.fn(actual.selectArticlesForRankingPrompt),
    selectArticlesForSynthesisPrompt: vi.fn(actual.selectArticlesForSynthesisPrompt),
  };
});

const mockAi: Settings['ai'] = {
  model: 'gemini-2.5-flash',
  customPreamble: '',
  temperature: 0.5,
  aiLanguage: 'English',
  aiPersona: 'Neutral Scientist',
  researchAssistant: {
    autoFetchSimilar: false,
    autoFetchOnline: false,
    authorSearchLimit: 10,
  },
  enableTldr: true,
  ncbiApiKey: '',
  forceHeuristicMode: false,
};

const mockInput: ResearchInput = {
  researchTopic: 'cancer therapy',
  dateRange: 'any',
  articleTypes: [],
  synthesisFocus: 'efficacy',
  maxArticlesToScan: 10,
  topNToSynthesize: 3,
  includeArxiv: false,
};

describe('generateAuthorQuery', () => {
  it('should handle a simple two-part name', () => {
    const result = generateAuthorQuery('Eric Lander');
    expect(result).toBe('("Eric Lander"[Author] OR "Lander E"[Author] OR "Lander Eric"[Author])');
  });

  it('should handle a name with a middle initial', () => {
    const result = generateAuthorQuery('Eric S. Lander');
    expect(result).toBe(
      '("Eric S Lander"[Author] OR "Lander ES"[Author] OR "Lander Eric"[Author])',
    );
  });

  it('should handle a name in "Last, First M" format', () => {
    const result = generateAuthorQuery('Lander, Eric S');
    expect(result).toBe(
      '("Eric S Lander"[Author] OR "Lander ES"[Author] OR "Lander Eric"[Author])',
    );
  });

  it('should handle a name with multiple middle names/initials', () => {
    const result = generateAuthorQuery('John Ronald Reuel Tolkien');
    expect(result).toBe(
      '("John Ronald Reuel Tolkien"[Author] OR "Tolkien JRR"[Author] OR "Tolkien John"[Author])',
    );
  });

  it('should handle a single name', () => {
    const result = generateAuthorQuery('Plato');
    expect(result).toBe('"Plato"[Author]');
  });

  it('should handle an empty string', () => {
    const result = generateAuthorQuery(' ');
    expect(result).toBe('""[Author]');
  });
});

describe('parseGeminiResponseJson', () => {
  it('parses raw JSON object', () => {
    expect(parseGeminiResponseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it('unwraps markdown json fences', () => {
    const text = '```json\n{"x":"y"}\n```';
    expect(parseGeminiResponseJson<{ x: string }>(text)).toEqual({ x: 'y' });
  });

  it('extracts JSON object from surrounding text', () => {
    const text = 'Here you go: {"k": true} thanks';
    expect(parseGeminiResponseJson<{ k: boolean }>(text)).toEqual({ k: true });
  });

  it('throws on empty input', () => {
    expect(() => parseGeminiResponseJson('')).toThrow(/Empty response/);
  });
});

describe('resetAIInstance', () => {
  it('is callable without throwing', () => {
    resetAIInstance();
    expect(true).toBe(true);
  });
});

describe('geminiService with mocked SDK', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateOllamaHealthCache();
    invalidateOllamaModelMetadataCache();
    mockPubMed.searchPubMedForIds.mockResolvedValue(['123']);
    mockPubMed.fetchArticleDetails.mockResolvedValue([
      {
        pmid: '123',
        title: 'T',
        summary: 'Abstract',
        authors: 'A',
        journal: 'J',
        pubYear: '2020',
        keywords: [],
        relevanceScore: 0,
        relevanceExplanation: '',
      },
    ]);
  });

  afterEach(() => {
    resetAIInstance();
    invalidateOllamaHealthCache();
    invalidateOllamaModelMetadataCache();
    vi.unstubAllGlobals();
  });

  it('findSimilarArticles returns parsed array', async () => {
    hoisted.generateContent.mockResolvedValue({
      text: JSON.stringify([{ pmid: '1', title: 'x', reason: 'y' }]),
    });
    mockPubMed.fetchArticleDetails.mockResolvedValueOnce([
      {
        pmid: '1',
        title: 'x',
        summary: 'S',
        authors: 'A',
        journal: 'J',
        pubYear: '2020',
        keywords: [],
        relevanceScore: 0,
        relevanceExplanation: '',
      },
    ]);
    const out = await findSimilarArticles({ title: 't', summary: 's' }, mockAi);
    expect(out).toHaveLength(1);
    expect(out[0].pmid).toBe('1');
  });

  it('findSimilarArticles drops PMIDs not returned by PubMed validation', async () => {
    hoisted.generateContent.mockResolvedValue({
      text: JSON.stringify([
        { pmid: '1', title: 'valid', reason: 'a' },
        { pmid: '999', title: 'hallucinated', reason: 'b' },
      ]),
    });
    mockPubMed.fetchArticleDetails.mockResolvedValueOnce([
      {
        pmid: '1',
        title: 'valid',
        summary: 'S',
        authors: 'A',
        journal: 'J',
        pubYear: '2020',
        keywords: [],
        relevanceScore: 0,
        relevanceExplanation: '',
      },
    ]);
    const out = await findSimilarArticles({ title: 't', summary: 's' }, mockAi);
    expect(out).toHaveLength(1);
    expect(out[0].pmid).toBe('1');
  });

  it('findSimilarArticles passes vault NCBI key to PubMed validation', async () => {
    hoisted.generateContent.mockResolvedValue({
      text: JSON.stringify([{ pmid: '1', title: 'x', reason: 'y' }]),
    });
    mockPubMed.fetchArticleDetails.mockResolvedValueOnce([
      {
        pmid: '1',
        title: 'x',
        summary: 'S',
        authors: 'A',
        journal: 'J',
        pubYear: '2020',
        keywords: [],
        relevanceScore: 0,
        relevanceExplanation: '',
      },
    ]);
    await findSimilarArticles({ title: 't', summary: 's' }, mockAi);
    expect(mockPubMed.fetchArticleDetails).toHaveBeenCalledWith(['1'], undefined, 'ncbi-vault-key');
  });

  it('findSimilarArticles rethrows STREAM_ABORTED when signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      findSimilarArticles({ title: 't', summary: 's' }, mockAi, controller.signal),
    ).rejects.toMatchObject({ code: 'STREAM_ABORTED' });
  });

  it('findSimilarArticles rethrows STREAM_ABORTED when PubMed fetch aborts', async () => {
    hoisted.generateContent.mockResolvedValue({
      text: JSON.stringify([{ pmid: '1', title: 'x', reason: 'y' }]),
    });
    const controller = new AbortController();
    mockPubMed.fetchArticleDetails.mockImplementationOnce((_pmids, signal) => {
      controller.abort();
      void signal;
      return Promise.reject(new DOMException('Aborted', 'AbortError'));
    });
    await expect(
      findSimilarArticles({ title: 't', summary: 's' }, mockAi, controller.signal),
    ).rejects.toMatchObject({ code: 'STREAM_ABORTED' });
  });

  it('findSimilarArticles propagates PubMed validation failures', async () => {
    hoisted.generateContent.mockResolvedValue({
      text: JSON.stringify([{ pmid: '1', title: 'x', reason: 'y' }]),
    });
    mockPubMed.fetchArticleDetails.mockRejectedValueOnce(new Error('PubMed unavailable'));
    await expect(findSimilarArticles({ title: 't', summary: 's' }, mockAi)).rejects.toThrow();
  });

  it('generateResearchAnalysis returns structured analysis', async () => {
    hoisted.generateContent.mockResolvedValue({
      text: JSON.stringify({
        summary: 's',
        keyFindings: ['a'],
        synthesizedTopic: 'topic',
      }),
    });
    const out = await generateResearchAnalysis('long text', mockAi);
    expect(out.synthesizedTopic).toBe('topic');
  });

  it('generateTldrSummary returns text', async () => {
    hoisted.generateContent.mockResolvedValue({ text: 'One-liner.' });
    await expect(generateTldrSummary('abstract text', mockAi)).resolves.toBe('One-liner.');
  });

  it('generateTldrSummary forwards abort signal to the provider', async () => {
    hoisted.generateContent.mockResolvedValue({ text: 'One-liner.' });
    const ac = new AbortController();
    await generateTldrSummary('abstract text', mockAi, ac.signal);
    expect(hoisted.generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({ abortSignal: ac.signal }),
      }),
    );
  });

  it('generateTldrSummary rejects when signal is already aborted', async () => {
    const ac = new AbortController();
    ac.abort();
    await expect(generateTldrSummary('abstract text', mockAi, ac.signal)).rejects.toMatchObject({
      code: 'STREAM_ABORTED',
    });
    expect(hoisted.generateContent).not.toHaveBeenCalled();
  });

  it('generateTldrSummary does not log when an in-flight call is aborted', async () => {
    const ac = new AbortController();
    const logSpy = vi.spyOn(safeLog, 'safeLogError').mockImplementation(() => {});
    hoisted.generateContent.mockImplementationOnce(async () => {
      ac.abort();
      throw new DOMException('Aborted', 'AbortError');
    });
    await expect(generateTldrSummary('abstract text', mockAi, ac.signal)).rejects.toMatchObject({
      code: 'STREAM_ABORTED',
    });
    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('generateResearchReportStream yields phases and completes', async () => {
    const rankingPayload = {
      rankedArticles: [
        {
          pmid: '123',
          relevanceScore: 95,
          relevanceExplanation: 'r',
          keywords: ['k'],
          articleType: 'Study',
          aiSummary: 'sum',
        },
      ],
      aiGeneratedInsights: [],
      overallKeywords: [],
    };

    hoisted.generateContent
      .mockResolvedValueOnce({
        text: JSON.stringify({
          generatedQueries: [{ query: 'cancer[Title]', explanation: 'e' }],
        }),
      })
      .mockResolvedValueOnce({
        text: JSON.stringify(rankingPayload),
      });

    hoisted.generateContentStream.mockImplementation(async () =>
      (async function* () {
        yield { text: 'syn ' };
      })(),
    );

    const phases: string[] = [];
    for await (const chunk of generateResearchReportStream(mockInput, mockAi)) {
      phases.push(chunk.phase);
      if (chunk.phase.includes('Finalizing')) break;
    }
    expect(phases.some((p) => p.includes('Phase 1'))).toBe(true);
    expect(phases.some((p) => p.includes('Phase 5') || p.includes('Streaming'))).toBe(true);
    expect(mockPubMed.searchPubMedForIds).toHaveBeenCalledWith(
      'cancer[Title]',
      10,
      undefined,
      'ncbi-vault-key',
    );
    expect(mockPubMed.fetchArticleDetails).toHaveBeenCalledWith(
      ['123'],
      undefined,
      'ncbi-vault-key',
    );
  });

  it('generateResearchReportStream yields ranking and synthesis promptBudget metadata', async () => {
    const rankingPayload = {
      rankedArticles: [
        {
          pmid: '123',
          relevanceScore: 95,
          relevanceExplanation: 'r',
          keywords: ['k'],
          articleType: 'Study',
          aiSummary: 'sum',
        },
      ],
      aiGeneratedInsights: [],
      overallKeywords: [],
    };

    hoisted.generateContent
      .mockResolvedValueOnce({
        text: JSON.stringify({
          generatedQueries: [{ query: 'cancer[Title]', explanation: 'e' }],
        }),
      })
      .mockResolvedValueOnce({
        text: JSON.stringify(rankingPayload),
      });

    hoisted.generateContentStream.mockImplementation(async () =>
      (async function* () {
        yield { text: 'syn ' };
      })(),
    );

    const budgets: Array<{ stage?: string; selectionMode?: string }> = [];
    for await (const chunk of generateResearchReportStream(mockInput, mockAi)) {
      if (chunk.promptBudget) {
        budgets.push({
          stage: chunk.promptBudget.stage,
          selectionMode: chunk.promptBudget.selectionMode,
        });
      }
      if (chunk.phase.includes('Finalizing')) break;
    }

    expect(budgets.some((b) => b.stage === 'ranking')).toBe(true);
    expect(budgets.some((b) => b.stage === 'synthesis')).toBe(true);
    expect(budgets.every((b) => typeof b.selectionMode === 'string')).toBe(true);
  });

  it('generateResearchReportStream throws before the ranking AI call when no article fits the context budget', async () => {
    hoisted.generateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        generatedQueries: [{ query: 'cancer[Title]', explanation: 'e' }],
      }),
    });
    const real = await vi.importActual<typeof import('../lib/promptBudget')>('../lib/promptBudget');
    vi.mocked(selectArticlesForRankingPrompt).mockImplementationOnce((...args) => {
      const result = real.selectArticlesForRankingPrompt(...args);
      return { ...result, payloads: [], accounting: { ...result.accounting, includedInPrompt: 0 } };
    });

    const drain = async () => {
      for await (const _chunk of generateResearchReportStream(mockInput, mockAi)) {
        // drain
      }
    };
    await expect(drain()).rejects.toMatchObject({ code: 'VALIDATION' });
    expect(hoisted.generateContent).toHaveBeenCalledTimes(1);
  });

  it('generateResearchReportStream throws before the synthesis AI call when no article fits the context budget', async () => {
    const rankingPayload = {
      rankedArticles: [
        {
          pmid: '123',
          relevanceScore: 95,
          relevanceExplanation: 'r',
          keywords: ['k'],
          articleType: 'Study',
          aiSummary: 'sum',
        },
      ],
      aiGeneratedInsights: [],
      overallKeywords: [],
    };
    hoisted.generateContent
      .mockResolvedValueOnce({
        text: JSON.stringify({
          generatedQueries: [{ query: 'cancer[Title]', explanation: 'e' }],
        }),
      })
      .mockResolvedValueOnce({
        text: JSON.stringify(rankingPayload),
      });

    const real = await vi.importActual<typeof import('../lib/promptBudget')>('../lib/promptBudget');
    vi.mocked(selectArticlesForSynthesisPrompt).mockImplementationOnce((...args) => {
      const result = real.selectArticlesForSynthesisPrompt(...args);
      return { ...result, payloads: [], accounting: { ...result.accounting, includedInPrompt: 0 } };
    });

    const drain = async () => {
      for await (const _chunk of generateResearchReportStream(mockInput, mockAi)) {
        // drain
      }
    };
    await expect(drain()).rejects.toMatchObject({ code: 'VALIDATION' });
    expect(hoisted.generateContentStream).not.toHaveBeenCalled();
  });

  it('generateResearchReportStream warms the /api/show metadata cache before ranking so the Ollama budget reflects the real context window, not the parameter heuristic - even when Settings/OllamaHealthPanel was never opened this session', async () => {
    const ollamaAi: Settings['ai'] = { ...mockAi, provider: 'ollama', model: 'llama3.1:8b' };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/api/version')) {
          return Promise.resolve({ ok: true, json: async () => ({ version: '0.5.0' }) });
        }
        if (url.endsWith('/api/tags')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ models: [{ name: 'llama3.1:8b' }] }),
          });
        }
        if (url.endsWith('/api/show')) {
          // Runtime num_ctx is far smaller than the 8_000-token parameter-count
          // heuristic an 8B model would otherwise get.
          return Promise.resolve({
            ok: true,
            json: async () => ({ model_info: { 'llama.context_length': 4_096 } }),
          });
        }
        if (url.endsWith('/api/generate')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              response: JSON.stringify({
                generatedQueries: [{ query: 'cancer[Title]', explanation: 'e' }],
              }),
            }),
          });
        }
        return Promise.reject(new Error(`Unexpected fetch in test: ${url}`));
      }),
    );

    const rankingBudgets: number[] = [];
    for await (const chunk of generateResearchReportStream(mockInput, ollamaAi)) {
      if (chunk.promptBudget?.stage === 'ranking') {
        rankingBudgets.push(chunk.promptBudget.inputTokenBudget);
        break; // the budget is computed and yielded before any ranking AI call is made
      }
    }

    expect(rankingBudgets).toHaveLength(1);
    const contextBasedBudget = 4_096 - OLLAMA_OUTPUT_TOKEN_RESERVE - OLLAMA_BUDGET_SAFETY_MARGIN;
    expect(rankingBudgets[0]).toBe(contextBasedBudget);
    expect(rankingBudgets[0]).not.toBe(8_000); // the parameter-heuristic default for an 8B model
  });

  it('generateResearchReportStream falls back to the parameter heuristic (not a crash or hang) when /api/show errors', async () => {
    const ollamaAi: Settings['ai'] = { ...mockAi, provider: 'ollama', model: 'llama3.1:8b' };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/api/version')) {
          return Promise.resolve({ ok: true, json: async () => ({ version: '0.5.0' }) });
        }
        if (url.endsWith('/api/tags')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ models: [{ name: 'llama3.1:8b' }] }),
          });
        }
        if (url.endsWith('/api/show')) {
          return Promise.resolve({ ok: false, status: 500 });
        }
        if (url.endsWith('/api/generate')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              response: JSON.stringify({
                generatedQueries: [{ query: 'cancer[Title]', explanation: 'e' }],
              }),
            }),
          });
        }
        return Promise.reject(new Error(`Unexpected fetch in test: ${url}`));
      }),
    );

    const rankingBudgets: number[] = [];
    for await (const chunk of generateResearchReportStream(mockInput, ollamaAi)) {
      if (chunk.promptBudget?.stage === 'ranking') {
        rankingBudgets.push(chunk.promptBudget.inputTokenBudget);
        break;
      }
    }

    expect(rankingBudgets).toHaveLength(1);
    // No cached context length -> falls back to the 8_000 parameter-count
    // heuristic for an 8B model instead of crashing or hanging the pipeline.
    expect(rankingBudgets[0]).toBe(8_000);
  });

  it('generateResearchReportStream does not fail the whole stream when the /api/show probe itself rejects with an abort-classified error (its own internal timeout), only the caller aborting should stop generation', async () => {
    const ollamaAi: Settings['ai'] = { ...mockAi, provider: 'ollama', model: 'llama3.1:8b' };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/api/version')) {
          return Promise.resolve({ ok: true, json: async () => ({ version: '0.5.0' }) });
        }
        if (url.endsWith('/api/tags')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ models: [{ name: 'llama3.1:8b' }] }),
          });
        }
        if (url.endsWith('/api/show')) {
          // Simulates probeOllamaModelMetadata's own internal timeout firing
          // (an abort-classified rejection) - distinct from the caller's
          // signal (never aborted in this test) being cancelled.
          return Promise.reject(new DOMException('Aborted', 'AbortError'));
        }
        if (url.endsWith('/api/generate')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              response: JSON.stringify({
                generatedQueries: [{ query: 'cancer[Title]', explanation: 'e' }],
              }),
            }),
          });
        }
        return Promise.reject(new Error(`Unexpected fetch in test: ${url}`));
      }),
    );

    const rankingBudgets: number[] = [];
    const drain = async () => {
      for await (const chunk of generateResearchReportStream(mockInput, ollamaAi)) {
        if (chunk.promptBudget?.stage === 'ranking') {
          rankingBudgets.push(chunk.promptBudget.inputTokenBudget);
          break;
        }
      }
    };

    // The stream must not reject just because one of the two concurrent
    // probes threw - only the caller's own signal being aborted should do that.
    await expect(drain()).resolves.toBeUndefined();
    expect(rankingBudgets).toHaveLength(1);
    expect(rankingBudgets[0]).toBe(8_000); // heuristic fallback, not a crash
  });

  it('generateResearchReportStream passes AbortSignal to synthesis stream', async () => {
    const rankingPayload = {
      rankedArticles: [
        {
          pmid: '123',
          relevanceScore: 95,
          relevanceExplanation: 'r',
          keywords: ['k'],
          articleType: 'Study',
          aiSummary: 'sum',
        },
      ],
      aiGeneratedInsights: [{ question: 'Q?', answer: 'A.', supportingArticles: ['123'] }],
      overallKeywords: [],
    };

    hoisted.generateContent
      .mockResolvedValueOnce({
        text: JSON.stringify({
          generatedQueries: [{ query: 'cancer[Title]', explanation: 'e' }],
        }),
      })
      .mockResolvedValueOnce({
        text: JSON.stringify(rankingPayload),
      });

    hoisted.generateContentStream.mockImplementation(async () =>
      (async function* () {
        yield { text: 'syn ' };
      })(),
    );

    const ac = new AbortController();
    for await (const _chunk of generateResearchReportStream(mockInput, mockAi, ac.signal)) {
      // drain
    }

    expect(hoisted.generateContentStream).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({ abortSignal: ac.signal }),
      }),
    );
  });

  it('generateResearchReportStream aborts when signal is aborted early', async () => {
    const ac = new AbortController();
    ac.abort();
    const gen = generateResearchReportStream(mockInput, mockAi, ac.signal);
    await expect(gen.next()).rejects.toMatchObject({ code: 'STREAM_ABORTED' });
  });

  it('generateResearchReportStream maps a mid-synthesis AbortError to STREAM_ABORTED', async () => {
    hoisted.generateContent
      .mockResolvedValueOnce({
        text: JSON.stringify({
          generatedQueries: [{ query: 'cancer[Title]', explanation: 'e' }],
        }),
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({
          rankedArticles: [
            {
              pmid: '123',
              relevanceScore: 95,
              relevanceExplanation: 'r',
              keywords: ['k'],
              articleType: 'Study',
              aiSummary: 'sum',
            },
          ],
          aiGeneratedInsights: [],
          overallKeywords: [],
        }),
      });
    const ac = new AbortController();
    hoisted.generateContentStream.mockImplementation(async () =>
      (async function* () {
        yield { text: 'syn ' };
        await new Promise<void>((_resolve, reject) => {
          const fail = (): void => {
            reject(new DOMException('Aborted', 'AbortError'));
          };
          if (ac.signal.aborted) {
            fail();
            return;
          }
          ac.signal.addEventListener('abort', fail, { once: true });
        });
      })(),
    );
    const gen = generateResearchReportStream(mockInput, mockAi, ac.signal);
    let sawSynthesisChunk = false;
    await expect(
      (async () => {
        for await (const event of gen) {
          if (event.phaseId === 'synthesis-stream') {
            sawSynthesisChunk = true;
            ac.abort();
          }
        }
      })(),
    ).rejects.toMatchObject({ code: 'STREAM_ABORTED', retryable: false });
    expect(sawSynthesisChunk).toBe(true);
  });

  it('generateResearchReportStream rejects invalid PubMed queries before search', async () => {
    hoisted.generateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        generatedQueries: [{ query: 'cancer OR OR therapy', explanation: 'bad' }],
      }),
    });
    const gen = generateResearchReportStream(mockInput, mockAi);
    // First event is frozen execution provenance (ADR 0017).
    await expect(gen.next()).resolves.toMatchObject({
      value: { phase: EXECUTION_PROVENANCE_PHASE, phaseId: 'execution-provenance' },
    });
    // Phase 1 query generation then validation failure before PubMed search.
    await expect(gen.next()).resolves.toBeDefined();
    await expect(gen.next()).rejects.toThrow(/PubMed query/i);
    expect(mockPubMed.searchPubMedForIds).not.toHaveBeenCalled();
  });

  it('uses heuristic TL;DR when API key is missing (no NO_API_KEY throw)', async () => {
    const { hasProviderApiKey } = await import('./apiKeyService');
    vi.mocked(hasProviderApiKey).mockResolvedValueOnce(false);
    hoisted.generateContent.mockClear();
    const out = await generateTldrSummary(
      'Background: Aspirin reduces cardiovascular events. Methods: Meta-analysis of RCTs. Results: Benefit outweighed bleeding in high-risk groups. Conclusion: Individualize therapy.',
      mockAi,
    );
    expect(out.length).toBeGreaterThan(10);
    expect(out.toLowerCase()).not.toMatch(/no_api_key/i);
    expect(hoisted.generateContent).not.toHaveBeenCalled();
  });

  it('forceHeuristicMode bypasses Gemini for research analysis', async () => {
    hoisted.generateContent.mockClear();
    const out = await generateResearchAnalysis(
      'SGLT2 inhibitors reduce heart failure hospitalization in diabetes cohorts with matched controls.',
      {
        ...mockAi,
        forceHeuristicMode: true,
      },
    );
    expect(out.summary).toMatch(/Heuristic/i);
    expect(out.synthesizedTopic.length).toBeGreaterThan(0);
    expect(hoisted.generateContent).not.toHaveBeenCalled();
  });

  it('findRelatedOnline maps grounding chunks when present', async () => {
    hoisted.generateContent.mockResolvedValue({
      text: 'Summary text',
      candidates: [
        {
          groundingMetadata: {
            groundingChunks: [{ web: { uri: 'https://ex', title: 't' } }],
          },
        },
      ],
    });
    const out = await findRelatedOnline('topic', mockAi);
    expect(out.summary).toContain('Summary');
    expect(out.sources.length).toBe(1);
  });

  it('findRelatedOnline forwards abort signal to the provider', async () => {
    hoisted.generateContent.mockResolvedValue({ text: 'Summary text', sources: [] });
    const ac = new AbortController();
    await findRelatedOnline('topic', mockAi, ac.signal);
    expect(hoisted.generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({ abortSignal: ac.signal }),
      }),
    );
  });

  it('findRelatedOnline does not log when an in-flight call is aborted', async () => {
    const ac = new AbortController();
    const logSpy = vi.spyOn(safeLog, 'safeLogError').mockImplementation(() => {});
    hoisted.generateContent.mockImplementationOnce(async () => {
      ac.abort();
      throw new DOMException('Aborted', 'AbortError');
    });
    await expect(findRelatedOnline('topic', mockAi, ac.signal)).rejects.toMatchObject({
      code: 'STREAM_ABORTED',
    });
    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('startChatWithReport rejects when signal is already aborted', async () => {
    const ac = new AbortController();
    ac.abort();
    await expect(
      startChatWithReport(
        {
          synthesis: 'syn',
          rankedArticles: [],
          generatedQueries: [],
          aiGeneratedInsights: [],
          overallKeywords: [],
        },
        mockAi,
        ac.signal,
      ),
    ).rejects.toMatchObject({ code: 'STREAM_ABORTED' });
  });

  it('disambiguateAuthor parses clusters', async () => {
    hoisted.generateContent.mockResolvedValue({
      text: JSON.stringify([
        {
          nameVariant: 'N',
          primaryAffiliation: 'A',
          topCoAuthors: ['c'],
          coreTopics: ['t'],
          publicationCount: 2,
          pmids: ['1'],
        },
      ]),
    });
    const out = await disambiguateAuthor('Name', [{ pmid: '1', title: 'T' }], mockAi);
    expect(out[0].nameVariant).toBe('N');
  });

  it('suggestAuthors parses suggestions', async () => {
    hoisted.generateContent.mockResolvedValue({
      text: JSON.stringify([{ name: 'Dr X', description: 'Does Y' }]),
    });
    const out = await suggestAuthors('biology', mockAi);
    expect(out[0].name).toBe('Dr X');
  });

  it('analyzeSingleArticle merges PubMed data with analysis', async () => {
    mockPubMed.fetchArticleDetails.mockResolvedValueOnce([
      {
        pmid: '123456',
        title: 'T',
        summary: 'S',
        authors: 'A',
        journal: 'J',
        pubYear: '2020',
        keywords: [],
        relevanceScore: 0,
        relevanceExplanation: '',
      },
    ]);
    hoisted.generateContent.mockResolvedValue({
      text: JSON.stringify({
        relevanceScore: 70,
        relevanceExplanation: 'ok',
        keywords: ['a'],
        articleType: 'Other',
      }),
    });
    const article = await analyzeSingleArticle('123456', mockAi);
    expect(article.pmid).toBe('123456');
    expect(article.relevanceScore).toBe(70);
  });

  it('analyzeSingleArticle extracts the PMID from a real pubmed.ncbi.nlm.nih.gov URL', async () => {
    mockPubMed.fetchArticleDetails.mockResolvedValueOnce([
      {
        pmid: '987654',
        title: 'T',
        summary: 'S',
        authors: 'A',
        journal: 'J',
        pubYear: '2020',
        keywords: [],
        relevanceScore: 0,
        relevanceExplanation: '',
      },
    ]);
    hoisted.generateContent.mockResolvedValue({
      text: JSON.stringify({
        relevanceScore: 50,
        relevanceExplanation: 'ok',
        keywords: [],
        articleType: 'Other',
      }),
    });
    const article = await analyzeSingleArticle('https://pubmed.ncbi.nlm.nih.gov/987654/', mockAi);
    expect(mockPubMed.fetchArticleDetails).toHaveBeenCalledWith(
      ['987654'],
      undefined,
      expect.anything(),
    );
    expect(article.pmid).toBe('987654');
  });

  it.each([
    ['query string', 'https://pubmed.ncbi.nlm.nih.gov/555111/?format=pubmed'],
    ['fragment', 'https://pubmed.ncbi.nlm.nih.gov/555111/#comments'],
  ])('analyzeSingleArticle extracts the PMID from a pubmed URL with a %s', async (_label, url) => {
    mockPubMed.fetchArticleDetails.mockResolvedValueOnce([
      {
        pmid: '555111',
        title: 'T',
        summary: 'S',
        authors: 'A',
        journal: 'J',
        pubYear: '2020',
        keywords: [],
        relevanceScore: 0,
        relevanceExplanation: '',
      },
    ]);
    hoisted.generateContent.mockResolvedValue({
      text: JSON.stringify({
        relevanceScore: 50,
        relevanceExplanation: 'ok',
        keywords: [],
        articleType: 'Other',
      }),
    });
    await analyzeSingleArticle(url, mockAi);
    expect(mockPubMed.fetchArticleDetails).toHaveBeenCalledWith(
      ['555111'],
      undefined,
      expect.anything(),
    );
  });

  it('analyzeSingleArticle does not misclassify a host that merely contains "doi.org/"', async () => {
    mockPubMed.fetchArticleDetails.mockResolvedValueOnce([
      {
        pmid: 'not-a-doi.org/lookup',
        title: 'T',
        summary: 'S',
        authors: 'A',
        journal: 'J',
        pubYear: '2020',
        keywords: [],
        relevanceScore: 0,
        relevanceExplanation: '',
      },
    ]);
    hoisted.generateContent.mockResolvedValue({
      text: JSON.stringify({
        relevanceScore: 50,
        relevanceExplanation: 'ok',
        keywords: [],
        articleType: 'Other',
      }),
    });
    // Not a URL at all (no scheme), so it must be treated as a raw identifier rather than
    // routed to the DOI-resolution branch just because it contains the substring "doi.org/".
    await analyzeSingleArticle('not-a-doi.org/lookup', mockAi);
    expect(mockPubMed.searchPubMedForIds).not.toHaveBeenCalled();
  });

  it('generateJournalProfileAnalysis returns profile', async () => {
    hoisted.generateContent.mockResolvedValue({
      text: JSON.stringify({
        name: 'Journal',
        issn: '1234-5678',
        description: 'Desc',
        oaPolicy: 'Hybrid',
        focusAreas: ['a'],
      }),
    });
    const profile = await generateJournalProfileAnalysis('Journal X', mockAi);
    expect(profile.issn).toBe('1234-5678');
  });

  describe('safeLogError on provider failures (P1-5)', () => {
    let safeLogErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      safeLogErrorSpy = vi.spyOn(safeLog, 'safeLogError').mockImplementation(() => {});
    });

    afterEach(() => {
      safeLogErrorSpy.mockRestore();
    });

    it('logs and maps findSimilarArticles errors', async () => {
      hoisted.generateContent.mockRejectedValueOnce(new Error('similar fail'));
      await expect(findSimilarArticles({ title: 't', summary: 's' }, mockAi)).rejects.toThrow();
      expect(safeLogErrorSpy).toHaveBeenCalledWith('Error generating content:', expect.any(Error));
    });

    it('logs and maps generateResearchAnalysis errors', async () => {
      hoisted.generateContent.mockRejectedValueOnce(new Error('analysis fail'));
      await expect(generateResearchAnalysis('text', mockAi)).rejects.toThrow();
      expect(safeLogErrorSpy).toHaveBeenCalledWith(
        'Error generating research analysis:',
        expect.any(Error),
      );
    });

    it('logs and maps generateTldrSummary errors when live', async () => {
      hoisted.generateContent.mockRejectedValueOnce(new Error('tldr fail'));
      await expect(generateTldrSummary('abstract', mockAi)).rejects.toThrow();
      expect(safeLogErrorSpy).toHaveBeenCalledWith(
        'Error generating TL;DR summary:',
        expect.any(Error),
      );
    });

    it('logs and maps findRelatedOnline errors', async () => {
      hoisted.generateContent.mockRejectedValueOnce(new Error('online fail'));
      await expect(findRelatedOnline('topic', mockAi)).rejects.toThrow();
      expect(safeLogErrorSpy).toHaveBeenCalledWith(
        'Error finding related online content:',
        expect.any(Error),
      );
    });

    it('logs and maps disambiguateAuthor errors', async () => {
      hoisted.generateContent.mockRejectedValueOnce(new Error('author fail'));
      await expect(
        disambiguateAuthor('Name', [{ pmid: '1', title: 'T' }], mockAi),
      ).rejects.toThrow();
      expect(safeLogErrorSpy).toHaveBeenCalledWith(
        'Error disambiguating author:',
        expect.any(Error),
      );
    });

    it('logs and maps suggestAuthors errors', async () => {
      hoisted.generateContent.mockRejectedValueOnce(new Error('suggest fail'));
      await expect(suggestAuthors('biology', mockAi)).rejects.toThrow();
      expect(safeLogErrorSpy).toHaveBeenCalledWith('Error suggesting authors:', expect.any(Error));
    });

    it('logs and maps generateJournalProfileAnalysis errors', async () => {
      hoisted.generateContent.mockRejectedValueOnce(new Error('journal fail'));
      await expect(generateJournalProfileAnalysis('Journal X', mockAi)).rejects.toThrow();
      expect(safeLogErrorSpy).toHaveBeenCalledWith(
        'Error generating journal profile analysis:',
        expect.any(Error),
      );
    });
  });
});
