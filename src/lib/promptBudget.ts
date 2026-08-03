/**
 * Provider-aware prompt budgeting for untrusted JSON corpora.
 * Bounds content before serialization — never truncates JSON mid-token.
 */

import type { AIProviderSelection } from '../services/providers/types';
import type { AbstractStatus, RankedArticle } from '../types';
import { estimateTokensFromText } from './resilience';
import { rankArticles } from '../services/nonAi/ranker';
import { estimateOllamaInputTokenBudget } from './ollamaContextBudget';
import { resolveCachedOllamaContextLength } from './ollamaModelMetadata';
import { resolveCachedOllamaParameterSize } from '../services/providers/ollamaHealth';

export type PromptFieldLimits = {
  maxTitleChars: number;
  maxAbstractChars: number;
};

/** Optional runtime hints for provider-specific budgeting. */
export type PromptBudgetOptions = {
  /** Active Ollama base URL — used only to read that endpoint's health-cache metadata. */
  ollamaBaseUrl?: string;
};

export const DEFAULT_PROMPT_FIELD_LIMITS: PromptFieldLimits = {
  maxTitleChars: 320,
  maxAbstractChars: 1200,
};

/** Conservative input token budgets (prompt body only, not full context window). */
const MODEL_INPUT_TOKEN_BUDGET: Record<string, number> = {
  default: 14_000,
  ollama: 8_000,
  heuristic: 8_000,
};

const PROVIDER_INPUT_TOKEN_BUDGET: Partial<Record<AIProviderSelection, number>> = {
  ollama: 8_000,
  heuristic: 8_000,
};

/** Reserved tokens for system prompt, JSON schema overhead, and model output. */
export const RANKING_PROMPT_OVERHEAD_TOKENS = 4_500;
export const SYNTHESIS_PROMPT_OVERHEAD_TOKENS = 3_000;

const RANKING_RESERVED_TOKENS = RANKING_PROMPT_OVERHEAD_TOKENS;
const SYNTHESIS_RESERVED_TOKENS = SYNTHESIS_PROMPT_OVERHEAD_TOKENS;

export type PromptBudgetAccounting = {
  stage: 'ranking' | 'synthesis';
  provider: AIProviderSelection;
  model: string;
  totalRetrieved: number;
  includedInPrompt: number;
  omittedFromPrompt: number;
  omittedPmids: string[];
  estimatedPromptTokens: number;
  inputTokenBudget: number;
  chunkIndex: number;
  chunkCount: number;
  truncatedTitleCount: number;
  truncatedAbstractCount: number;
  /** Synthesis-only: truncated `aiSummary` fields (separate from source abstract). */
  truncatedAiSummaryCount?: number;
  selectionMode: 'lexical-prefilter' | 'full-corpus';
};

export type RankingArticlePromptPayload = {
  pmid: string;
  title: string;
  sourceAbstract: string;
  abstractStatus: AbstractStatus;
  lexicalRankScore?: number;
};

export const getInputTokenBudget = (
  provider: AIProviderSelection,
  model: string,
  options?: PromptBudgetOptions,
): number => {
  if (provider === 'ollama') {
    const parameterSize = resolveCachedOllamaParameterSize(options?.ollamaBaseUrl, model);
    const contextLength = resolveCachedOllamaContextLength(options?.ollamaBaseUrl, model);
    return estimateOllamaInputTokenBudget(model, { parameterSize, contextLength }).budget;
  }
  const modelKey = model.toLowerCase();
  if (/pro|opus|gpt-5|o3/i.test(modelKey)) {
    return 28_000;
  }
  if (/flash|mini|haiku|8b|7b/i.test(modelKey)) {
    return 16_000;
  }
  return PROVIDER_INPUT_TOKEN_BUDGET[provider] ?? MODEL_INPUT_TOKEN_BUDGET.default;
};

export const boundTextField = (
  text: string,
  maxChars: number,
): { text: string; truncated: boolean } => {
  const normalized = text ?? '';
  if (normalized.length <= maxChars) {
    return { text: normalized, truncated: false };
  }
  return { text: `${normalized.slice(0, maxChars)}…`, truncated: true };
};

export const shapeArticleForRankingPrompt = (
  article: Partial<RankedArticle>,
  limits: PromptFieldLimits = DEFAULT_PROMPT_FIELD_LIMITS,
): {
  payload: RankingArticlePromptPayload;
  truncatedTitle: boolean;
  truncatedAbstract: boolean;
} => {
  const titleBound = boundTextField(article.title ?? '', limits.maxTitleChars);
  const abstractBound = boundTextField(article.summary ?? '', limits.maxAbstractChars);
  const abstractStatus: AbstractStatus =
    article.abstractStatus ?? (article.summary ? 'available' : 'missing');

  return {
    payload: {
      pmid: article.pmid ?? '',
      title: titleBound.text,
      sourceAbstract: abstractBound.text,
      abstractStatus,
      lexicalRankScore: article.relevanceScore,
    },
    truncatedTitle: titleBound.truncated,
    truncatedAbstract: abstractBound.truncated,
  };
};

const toRankableArticle = (article: Partial<RankedArticle>): RankedArticle => ({
  pmid: article.pmid ?? '',
  title: article.title ?? '',
  authors: article.authors ?? '',
  journal: article.journal ?? '',
  pubYear: article.pubYear ?? '0000',
  summary: article.summary ?? '',
  relevanceScore: article.relevanceScore ?? 0,
  relevanceExplanation: article.relevanceExplanation ?? '',
  keywords: article.keywords ?? [],
  isOpenAccess: article.isOpenAccess ?? false,
  abstractStatus: article.abstractStatus,
});

const payloadFitsTokenBudget = (payload: unknown[], maxTokens: number): boolean => {
  const json = JSON.stringify(payload);
  return estimateTokensFromText(json) <= maxTokens;
};

export type RankingPromptSelection = {
  payloads: RankingArticlePromptPayload[];
  includedArticles: Partial<RankedArticle>[];
  omittedPmids: string[];
  accounting: PromptBudgetAccounting;
};

/**
 * Deterministic lexical pre-rank, then include the maximum prefix that fits the token budget.
 * Articles omitted from the LLM prompt remain lexically scored and listed in accounting.
 */
export const selectArticlesForRankingPrompt = (
  articles: Partial<RankedArticle>[],
  topic: string,
  provider: AIProviderSelection,
  model: string,
  limits: PromptFieldLimits = DEFAULT_PROMPT_FIELD_LIMITS,
  options?: PromptBudgetOptions,
): RankingPromptSelection => {
  const rankable = articles.filter((a) => a.pmid).map(toRankableArticle);
  const lexicallyRanked = rankArticles(rankable, topic).sort(
    (a, b) => b.relevanceScore - a.relevanceScore,
  );

  const inputBudget = getInputTokenBudget(provider, model, options);
  const availableTokens = Math.max(0, inputBudget - RANKING_RESERVED_TOKENS);

  let bestCount = 0;
  let bestPayloads: RankingArticlePromptPayload[] = [];
  let truncatedTitleCount = 0;
  let truncatedAbstractCount = 0;

  for (let count = lexicallyRanked.length; count >= 1; count -= 1) {
    const subset = lexicallyRanked.slice(0, count);
    const shaped = subset.map((article) => shapeArticleForRankingPrompt(article, limits));
    const payloads = shaped.map((s, index) => ({
      ...s.payload,
      lexicalRankScore: subset[index].relevanceScore,
    }));

    if (payloadFitsTokenBudget(payloads, availableTokens)) {
      bestCount = count;
      bestPayloads = payloads;
      truncatedTitleCount = shaped.filter((s) => s.truncatedTitle).length;
      truncatedAbstractCount = shaped.filter((s) => s.truncatedAbstract).length;
      break;
    }
  }

  const includedArticles = lexicallyRanked.slice(0, bestCount);
  const omittedPmids = lexicallyRanked.slice(bestCount).map((a) => a.pmid);

  const accounting: PromptBudgetAccounting = {
    stage: 'ranking',
    provider,
    model,
    totalRetrieved: articles.length,
    includedInPrompt: bestCount,
    omittedFromPrompt: omittedPmids.length,
    omittedPmids,
    estimatedPromptTokens: estimateTokensFromText(JSON.stringify(bestPayloads)),
    inputTokenBudget: inputBudget,
    chunkIndex: 1,
    chunkCount: 1,
    truncatedTitleCount,
    truncatedAbstractCount,
    truncatedAiSummaryCount: 0,
    selectionMode: omittedPmids.length > 0 ? 'lexical-prefilter' : 'full-corpus',
  };

  return {
    payloads: bestPayloads,
    includedArticles,
    omittedPmids,
    accounting,
  };
};

export type SynthesisArticlePromptPayload = RankingArticlePromptPayload & {
  aiSummary?: string;
  relevanceScore: number;
  keywords: string[];
};

export type SynthesisPromptSelection = {
  payloads: SynthesisArticlePromptPayload[];
  accounting: PromptBudgetAccounting;
};

const shapeArticleForSynthesisPrompt = (
  article: RankedArticle,
  limits: PromptFieldLimits = DEFAULT_PROMPT_FIELD_LIMITS,
): {
  payload: SynthesisArticlePromptPayload;
  truncatedTitle: boolean;
  truncatedAbstract: boolean;
  truncatedAiSummary: boolean;
} => {
  const base = shapeArticleForRankingPrompt(article, limits);
  const aiBound = boundTextField(article.aiSummary ?? '', limits.maxAbstractChars);
  return {
    ...base,
    payload: {
      ...base.payload,
      aiSummary: aiBound.text,
      relevanceScore: article.relevanceScore,
      keywords: article.keywords ?? [],
    },
    truncatedAiSummary: aiBound.truncated,
  };
};

/** Bound ranked articles for synthesis JSON blocks. */
export const selectArticlesForSynthesisPrompt = (
  articles: RankedArticle[],
  provider: AIProviderSelection,
  model: string,
  limits: PromptFieldLimits = DEFAULT_PROMPT_FIELD_LIMITS,
  options?: PromptBudgetOptions,
): SynthesisPromptSelection => {
  const inputBudget = getInputTokenBudget(provider, model, options);
  const availableTokens = Math.max(0, inputBudget - SYNTHESIS_RESERVED_TOKENS);

  let bestCount = 0;
  let bestPayloads: SynthesisArticlePromptPayload[] = [];
  let truncatedTitleCount = 0;
  let truncatedAbstractCount = 0;
  let truncatedAiSummaryCount = 0;

  for (let count = articles.length; count >= 1; count -= 1) {
    const subset = articles.slice(0, count);
    const shaped = subset.map((article) => shapeArticleForSynthesisPrompt(article, limits));
    const payloads = shaped.map((s) => s.payload);

    if (payloadFitsTokenBudget(payloads, availableTokens)) {
      bestCount = count;
      bestPayloads = payloads;
      truncatedTitleCount = shaped.filter((s) => s.truncatedTitle).length;
      truncatedAbstractCount = shaped.filter((s) => s.truncatedAbstract).length;
      truncatedAiSummaryCount = shaped.filter((s) => s.truncatedAiSummary).length;
      break;
    }
  }

  const omittedPmids = articles.slice(bestCount).map((a) => a.pmid);

  return {
    payloads: bestPayloads,
    accounting: {
      stage: 'synthesis',
      provider,
      model,
      totalRetrieved: articles.length,
      includedInPrompt: bestCount,
      omittedFromPrompt: omittedPmids.length,
      omittedPmids,
      estimatedPromptTokens: estimateTokensFromText(JSON.stringify(bestPayloads)),
      inputTokenBudget: inputBudget,
      chunkIndex: 1,
      chunkCount: 1,
      truncatedTitleCount,
      truncatedAbstractCount,
      truncatedAiSummaryCount,
      selectionMode: omittedPmids.length > 0 ? 'lexical-prefilter' : 'full-corpus',
    },
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isValidNonNegativeFinite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

/** Parse prompt-budget accounting from Agent Debugger trace metadata. */
export const parsePromptBudgetFromMetadata = (
  metadata?: Record<string, unknown>,
): PromptBudgetAccounting | undefined => {
  if (!metadata) return undefined;
  const raw = metadata.promptBudget;
  if (!isRecord(raw)) return undefined;

  const stage = raw.stage;
  if (stage !== 'ranking' && stage !== 'synthesis') return undefined;

  const totalRetrieved = raw.totalRetrieved;
  const includedInPrompt = raw.includedInPrompt;
  const omittedFromPrompt = raw.omittedFromPrompt;
  const estimatedPromptTokens = raw.estimatedPromptTokens;
  const inputTokenBudget = raw.inputTokenBudget;

  if (
    !isValidNonNegativeFinite(totalRetrieved) ||
    !isValidNonNegativeFinite(includedInPrompt) ||
    !isValidNonNegativeFinite(omittedFromPrompt) ||
    !isValidNonNegativeFinite(estimatedPromptTokens) ||
    !isValidNonNegativeFinite(inputTokenBudget)
  ) {
    return undefined;
  }

  const omittedPmids = Array.isArray(raw.omittedPmids)
    ? raw.omittedPmids.filter((id): id is string => typeof id === 'string')
    : [];

  const selectionMode = raw.selectionMode;
  const normalizedSelectionMode =
    selectionMode === 'lexical-prefilter' || selectionMode === 'full-corpus'
      ? selectionMode
      : omittedFromPrompt > 0
        ? 'lexical-prefilter'
        : 'full-corpus';

  const chunkIndex = raw.chunkIndex;
  const chunkCount = raw.chunkCount;
  const truncatedTitleCount = raw.truncatedTitleCount;
  const truncatedAbstractCount = raw.truncatedAbstractCount;
  const truncatedAiSummaryCount = raw.truncatedAiSummaryCount;

  return {
    stage,
    provider: (typeof raw.provider === 'string' ? raw.provider : 'gemini') as AIProviderSelection,
    model: typeof raw.model === 'string' ? raw.model : 'unknown',
    totalRetrieved,
    includedInPrompt,
    omittedFromPrompt,
    omittedPmids,
    estimatedPromptTokens,
    inputTokenBudget,
    chunkIndex: isValidNonNegativeFinite(chunkIndex) && chunkIndex > 0 ? chunkIndex : 1,
    chunkCount: isValidNonNegativeFinite(chunkCount) && chunkCount > 0 ? chunkCount : 1,
    truncatedTitleCount: isValidNonNegativeFinite(truncatedTitleCount) ? truncatedTitleCount : 0,
    truncatedAbstractCount: isValidNonNegativeFinite(truncatedAbstractCount)
      ? truncatedAbstractCount
      : 0,
    truncatedAiSummaryCount: isValidNonNegativeFinite(truncatedAiSummaryCount)
      ? truncatedAiSummaryCount
      : 0,
    selectionMode: normalizedSelectionMode,
  };
};
