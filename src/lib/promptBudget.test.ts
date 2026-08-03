import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  boundTextField,
  DEFAULT_PROMPT_FIELD_LIMITS,
  parsePromptBudgetFromMetadata,
  selectArticlesForRankingPrompt,
  selectArticlesForSynthesisPrompt,
  shapeArticleForRankingPrompt,
  getInputTokenBudget,
  SYNTHESIS_PROMPT_OVERHEAD_TOKENS,
} from './promptBudget';
import { wrapUntrustedJsonBlock } from './untrustedDataFraming';
import type { RankedArticle } from '../types';
import { invalidateOllamaHealthCache, probeOllamaHealth } from '../services/providers/ollamaHealth';
import {
  invalidateOllamaModelMetadataCache,
  probeOllamaModelMetadata,
} from './ollamaModelMetadata';
import { OLLAMA_BUDGET_SAFETY_MARGIN, OLLAMA_OUTPUT_TOKEN_RESERVE } from './ollamaContextBudget';

const makeArticle = (pmid: string, title: string, summary = 'Abstract text.'): RankedArticle => ({
  pmid,
  title,
  authors: 'A',
  journal: 'J',
  pubYear: '2024',
  summary,
  relevanceScore: 0,
  relevanceExplanation: '',
  keywords: [],
  isOpenAccess: false,
  abstractStatus: 'available',
});

describe('selectArticlesForRankingPrompt (small Ollama context)', () => {
  beforeEach(() => {
    invalidateOllamaModelMetadataCache();
    vi.restoreAllMocks();
  });
  afterEach(() => {
    invalidateOllamaModelMetadataCache();
  });

  it('omits corpus when runtime context cannot cover ranking overhead', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ model_info: { context_length: 4_096 } }),
    });
    await probeOllamaModelMetadata('http://localhost:11434', 'tiny-local', { force: true });

    const articles = [makeArticle('1', 'aspirin trial'), makeArticle('2', 'cardiovascular study')];
    const selection = selectArticlesForRankingPrompt(
      articles,
      'aspirin',
      'ollama',
      'tiny-local',
      undefined,
      { ollamaBaseUrl: 'http://localhost:11434' },
    );

    const expectedBudget = 4_096 - OLLAMA_OUTPUT_TOKEN_RESERVE - OLLAMA_BUDGET_SAFETY_MARGIN;
    expect(selection.accounting.inputTokenBudget).toBe(expectedBudget);
    expect(selection.accounting.includedInPrompt).toBe(0);
    expect(selection.accounting.omittedFromPrompt).toBe(2);
    expect(selection.accounting.estimatedPromptTokens).toBeLessThanOrEqual(expectedBudget);
  });
});

describe('getInputTokenBudget (ollama active-endpoint metadata)', () => {
  beforeEach(() => {
    invalidateOllamaHealthCache();
    invalidateOllamaModelMetadataCache();
    vi.restoreAllMocks();
  });
  afterEach(() => {
    invalidateOllamaHealthCache();
    invalidateOllamaModelMetadataCache();
  });

  it('uses parameterSize from the active Ollama endpoint cache only', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ version: '0.5.0' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [{ name: 'custom-local', details: { parameter_size: '1B' } }],
        }),
      });
    await probeOllamaHealth('http://localhost:11434', { force: true });

    expect(getInputTokenBudget('ollama', 'custom-local')).toBe(8_000);
    expect(
      getInputTokenBudget('ollama', 'custom-local', {
        ollamaBaseUrl: 'http://localhost:11434',
      }),
    ).toBe(6_000);
    expect(
      getInputTokenBudget('ollama', 'custom-local', {
        ollamaBaseUrl: 'http://127.0.0.1:11434',
      }),
    ).toBe(8_000);
  });
});

describe('wrapUntrustedJsonBlock', () => {
  it('never produces syntactically truncated JSON', () => {
    const large = Array.from({ length: 80 }, (_, i) => ({
      pmid: String(i + 1),
      title: `Aspirin cardiovascular study ${i} with extra detail`,
      sourceAbstract: 'x'.repeat(800),
      abstractStatus: 'available' as const,
    }));
    const wrapped = wrapUntrustedJsonBlock('articles', large);
    const inner = wrapped
      .replace(/^<<<UNTRUSTED_DATA:articles\n/, '')
      .replace(/\n>>>END_UNTRUSTED_DATA$/, '');
    const parsed = JSON.parse(inner);
    expect(parsed).toHaveLength(80);
  });
});

describe('selectArticlesForRankingPrompt', () => {
  it('includes a high-relevance tail article via lexical pre-ranking', () => {
    const articles: RankedArticle[] = Array.from({ length: 90 }, (_, i) =>
      makeArticle(
        String(i + 1),
        `Misc unrelated topic paper ${i}`,
        'x'.repeat(DEFAULT_PROMPT_FIELD_LIMITS.maxAbstractChars),
      ),
    );
    articles.push(
      makeArticle(
        '999',
        'Aspirin cardiovascular randomized trial outcomes aspirin aspirin',
        'Aspirin reduces cardiovascular events in aspirin trials.',
      ),
    );

    const selection = selectArticlesForRankingPrompt(
      articles,
      'aspirin cardiovascular randomized trial',
      'gemini',
      'gemini-2.5-flash',
    );

    const includedPmids = selection.payloads.map((p) => p.pmid);
    expect(includedPmids).toContain('999');
    expect(selection.accounting.omittedFromPrompt).toBeGreaterThan(0);
    expect(selection.accounting.selectionMode).toBe('lexical-prefilter');
  });

  it('handles Unicode titles without breaking JSON wrapping', () => {
    const articles = [
      makeArticle(
        '1',
        'Café naïve résumé — aspirin 日本語 β',
        'Abstract with emoji 🧬 and ümlauts',
      ),
    ];
    const selection = selectArticlesForRankingPrompt(
      articles,
      'aspirin',
      'gemini',
      'gemini-2.5-flash',
    );
    const wrapped = wrapUntrustedJsonBlock('article_list', selection.payloads);
    const inner = wrapped
      .replace(/^<<<UNTRUSTED_DATA:article_list\n/, '')
      .replace(/\n>>>END_UNTRUSTED_DATA$/, '');
    expect(JSON.parse(inner)[0].title).toContain('Café');
  });
});

describe('boundTextField', () => {
  it('marks truncation at field boundaries', () => {
    const { text, truncated } = boundTextField('abcdefgh', 5);
    expect(truncated).toBe(true);
    expect(text).toBe('abcde…');
  });

  it('shapeArticleForRankingPrompt applies per-field limits', () => {
    const shaped = shapeArticleForRankingPrompt(
      makeArticle('1', 't'.repeat(500), 'a'.repeat(2000)),
      { maxTitleChars: 10, maxAbstractChars: 20 },
    );
    expect(shaped.truncatedTitle).toBe(true);
    expect(shaped.truncatedAbstract).toBe(true);
    expect(shaped.payload.title.length).toBeLessThanOrEqual(11);
  });
});

describe('prompt budget boundaries', () => {
  it('fits within configured token budget estimate', () => {
    const articles = Array.from({ length: 30 }, (_, i) =>
      makeArticle(
        String(i),
        `aspirin study ${i}`,
        'x'.repeat(DEFAULT_PROMPT_FIELD_LIMITS.maxAbstractChars),
      ),
    );
    const selection = selectArticlesForRankingPrompt(articles, 'aspirin', 'heuristic', 'local');
    const available = Math.max(1_000, 8_000 - 4_500);
    expect(selection.accounting.estimatedPromptTokens).toBeLessThanOrEqual(available);
    expect(selection.payloads.length).toBeGreaterThan(0);
  });
});

describe('selectArticlesForSynthesisPrompt', () => {
  it('bounds ranked articles within synthesis token budget', () => {
    const articles = Array.from({ length: 40 }, (_, i) => {
      const article = makeArticle(
        String(i + 1),
        `aspirin cardiovascular study ${i}`,
        'x'.repeat(DEFAULT_PROMPT_FIELD_LIMITS.maxAbstractChars),
      );
      article.relevanceScore = 90 - i;
      article.aiSummary = `Summary for ${article.pmid}`;
      return article;
    });

    const selection = selectArticlesForSynthesisPrompt(articles, 'gemini', 'gemini-2.5-flash');
    const inputBudget = getInputTokenBudget('gemini', 'gemini-2.5-flash');
    const available = Math.max(800, inputBudget - SYNTHESIS_PROMPT_OVERHEAD_TOKENS);

    expect(selection.accounting.stage).toBe('synthesis');
    expect(selection.accounting.estimatedPromptTokens).toBeLessThanOrEqual(available);
    expect(selection.payloads.length).toBeGreaterThan(0);
    expect(selection.accounting.omittedFromPrompt).toBe(
      articles.length - selection.accounting.includedInPrompt,
    );
    expect(selection.accounting.truncatedAiSummaryCount).toBeTypeOf('number');
  });

  it('tracks abstract and aiSummary truncation separately for synthesis', () => {
    const articles = [
      makeArticle('1', 't'.repeat(500), 'a'.repeat(2000)),
      makeArticle('2', 'short', 'short abstract'),
    ];
    articles[0].aiSummary = 's'.repeat(2000);
    articles[1].aiSummary = 'brief summary';

    const selection = selectArticlesForSynthesisPrompt(articles, 'gemini', 'gemini-2.5-flash');

    expect(selection.accounting.truncatedAbstractCount).toBe(1);
    expect(selection.accounting.truncatedAiSummaryCount).toBe(1);
  });
});

describe('parsePromptBudgetFromMetadata', () => {
  it('returns undefined for invalid metadata', () => {
    expect(parsePromptBudgetFromMetadata(undefined)).toBeUndefined();
    expect(parsePromptBudgetFromMetadata({ promptBudget: null })).toBeUndefined();
    expect(parsePromptBudgetFromMetadata({ promptBudget: { stage: 'invalid' } })).toBeUndefined();
  });

  it('parses ranking accounting from trace metadata', () => {
    const accounting = selectArticlesForRankingPrompt(
      [makeArticle('1', 'aspirin trial')],
      'aspirin',
      'gemini',
      'gemini-2.5-flash',
    ).accounting;

    const parsed = parsePromptBudgetFromMetadata({ promptBudget: accounting });
    expect(parsed).toEqual(accounting);
  });

  it('rejects non-finite and negative accounting numbers', () => {
    const base = {
      stage: 'ranking' as const,
      provider: 'gemini' as const,
      model: 'gemini-2.5-flash',
      includedInPrompt: 1,
      omittedFromPrompt: 0,
      omittedPmids: [] as string[],
      estimatedPromptTokens: 500,
      inputTokenBudget: 14_000,
      chunkIndex: 1,
      chunkCount: 1,
      truncatedTitleCount: 0,
      truncatedAbstractCount: 0,
      selectionMode: 'full-corpus' as const,
    };

    expect(
      parsePromptBudgetFromMetadata({ promptBudget: { ...base, totalRetrieved: NaN } }),
    ).toBeUndefined();
    expect(
      parsePromptBudgetFromMetadata({ promptBudget: { ...base, totalRetrieved: -1 } }),
    ).toBeUndefined();
    expect(
      parsePromptBudgetFromMetadata({
        promptBudget: { ...base, totalRetrieved: 5, estimatedPromptTokens: Infinity },
      }),
    ).toBeUndefined();
  });

  it('infers lexical-prefilter when omittedFromPrompt > 0 without omittedPmids', () => {
    const parsed = parsePromptBudgetFromMetadata({
      promptBudget: {
        stage: 'ranking',
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        totalRetrieved: 10,
        includedInPrompt: 5,
        omittedFromPrompt: 5,
        omittedPmids: [],
        estimatedPromptTokens: 1000,
        inputTokenBudget: 14_000,
        chunkIndex: 1,
        chunkCount: 1,
        truncatedTitleCount: 0,
        truncatedAbstractCount: 0,
      },
    });

    expect(parsed?.selectionMode).toBe('lexical-prefilter');
  });

  it('defaults truncatedAiSummaryCount to zero for legacy metadata', () => {
    const parsed = parsePromptBudgetFromMetadata({
      promptBudget: {
        stage: 'synthesis',
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        totalRetrieved: 2,
        includedInPrompt: 2,
        omittedFromPrompt: 0,
        omittedPmids: [],
        estimatedPromptTokens: 400,
        inputTokenBudget: 14_000,
      },
    });

    expect(parsed?.truncatedAiSummaryCount).toBe(0);
  });

  it('rejects invalid chunk indices and uses safe defaults', () => {
    const accounting = selectArticlesForRankingPrompt(
      [makeArticle('1', 'aspirin')],
      'aspirin',
      'gemini',
      'gemini-2.5-flash',
    ).accounting;

    const parsed = parsePromptBudgetFromMetadata({
      promptBudget: {
        ...accounting,
        chunkIndex: -1,
        chunkCount: NaN,
        truncatedTitleCount: Infinity,
      },
    });

    expect(parsed?.chunkIndex).toBe(1);
    expect(parsed?.chunkCount).toBe(1);
    expect(parsed?.truncatedTitleCount).toBe(0);
  });
});
