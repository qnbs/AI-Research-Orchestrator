import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ResearchInput, Settings } from '../types';
import {
  generateAuthorQuery,
  parseGeminiResponseJson,
  resetAIInstance,
  findSimilarArticles,
  generateResearchAnalysis,
  generateResearchReportStream,
  generateTldrSummary,
  findRelatedOnline,
  disambiguateAuthor,
  suggestAuthors,
  analyzeSingleArticle,
  generateJournalProfileAnalysis,
} from './geminiService';

const hoisted = vi.hoisted(() => ({
  generateContent: vi.fn(),
  generateContentStream: vi.fn(),
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: hoisted.generateContent,
      generateContentStream: hoisted.generateContentStream,
    },
    chats: {
      create: vi.fn(() => ({
        sendMessageStream: vi.fn(async function* () {
          yield { text: 'reply' };
        }),
      })),
    },
  })),
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
  });

  it('findSimilarArticles returns parsed array', async () => {
    hoisted.generateContent.mockResolvedValue({
      text: JSON.stringify([{ pmid: '1', title: 'x', reason: 'y' }]),
    });
    const out = await findSimilarArticles({ title: 't', summary: 's' }, mockAi);
    expect(out).toHaveLength(1);
    expect(out[0].pmid).toBe('1');
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

  it('generateResearchReportStream aborts when signal is aborted early', async () => {
    const ac = new AbortController();
    ac.abort();
    const gen = generateResearchReportStream(mockInput, mockAi, ac.signal);
    await expect(gen.next()).rejects.toMatchObject({ code: 'STREAM_ABORTED' });
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
});
