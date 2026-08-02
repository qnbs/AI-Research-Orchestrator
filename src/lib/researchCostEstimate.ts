/**
 * Provider-aware research run cost estimation (P1-2).
 * Uses prompt-budget selection for input token sizing — not a billing guarantee.
 */

import type { AIProviderSelection } from '../services/providers/types';
import type { RankedArticle } from '../types';
import { getProviderMeta } from '../services/providers/provider';
import { estimateTokensFromText } from './resilience';
import {
  DEFAULT_PROMPT_FIELD_LIMITS,
  RANKING_PROMPT_OVERHEAD_TOKENS,
  SYNTHESIS_PROMPT_OVERHEAD_TOKENS,
  selectArticlesForRankingPrompt,
  selectArticlesForSynthesisPrompt,
} from './promptBudget';
import {
  computeUsdFromRates,
  resolveProviderRateQuote,
  type PricingConfidence,
} from './providerPricing';

export type ResearchCostEstimate = {
  provider: AIProviderSelection;
  providerLabel: string;
  model: string;
  estimatedUsd: number | null;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  currency: 'USD';
  pricingConfidence: PricingConfidence;
  pricingTierLabel: string;
  pricingSource?: string;
  pricingAsOf?: string;
};

const QUERY_GEN_OVERHEAD_TOKENS = 800;
const RANKING_OUTPUT_TOKENS = 250;
const SYNTHESIS_OUTPUT_BASE = 600;
const SYNTHESIS_OUTPUT_PER_ARTICLE = 150;
const SYNTHESIS_OUTPUT_TAIL = 400;

function buildStubCorpus(count: number, topic: string): RankedArticle[] {
  const topicSnippet = topic.slice(0, 48);
  return Array.from({ length: count }, (_, index) => ({
    pmid: String(index + 1),
    title: `${topicSnippet} study ${index}`
      .padEnd(64, ' ')
      .slice(0, DEFAULT_PROMPT_FIELD_LIMITS.maxTitleChars),
    authors: 'Stub Author',
    journal: 'Stub Journal',
    pubYear: '2024',
    summary: 'x'.repeat(DEFAULT_PROMPT_FIELD_LIMITS.maxAbstractChars),
    relevanceScore: 50,
    relevanceExplanation: '',
    keywords: [topicSnippet],
    isOpenAccess: false,
    abstractStatus: 'available' as const,
    aiSummary: 'Derived summary stub.',
  }));
}

function estimatePipelineTokens(
  provider: AIProviderSelection,
  model: string,
  topic: string,
  maxArticlesToScan: number,
  topNToSynthesize: number,
): { inputTokens: number; outputTokens: number } {
  const scanCount = Math.max(1, maxArticlesToScan);
  const synthCount = Math.max(1, Math.min(topNToSynthesize, scanCount));
  const corpus = buildStubCorpus(scanCount, topic);

  const ranking = selectArticlesForRankingPrompt(corpus, topic, provider, model);
  const rankedForSynth: RankedArticle[] = ranking.includedArticles.map((partial, index) => ({
    pmid: partial.pmid ?? String(index + 1),
    title: partial.title ?? '',
    authors: partial.authors ?? '',
    journal: partial.journal ?? '',
    pubYear: partial.pubYear ?? '2024',
    summary: partial.summary ?? '',
    relevanceScore: partial.relevanceScore ?? 50,
    relevanceExplanation: partial.relevanceExplanation ?? '',
    keywords: partial.keywords ?? [],
    isOpenAccess: partial.isOpenAccess ?? false,
    abstractStatus: partial.abstractStatus,
    aiSummary: partial.aiSummary,
  }));

  const synthesis = selectArticlesForSynthesisPrompt(
    rankedForSynth.slice(0, synthCount),
    provider,
    model,
  );

  const inputTokens =
    estimateTokensFromText(topic) +
    QUERY_GEN_OVERHEAD_TOKENS +
    ranking.accounting.estimatedPromptTokens +
    RANKING_PROMPT_OVERHEAD_TOKENS +
    synthesis.accounting.estimatedPromptTokens +
    SYNTHESIS_PROMPT_OVERHEAD_TOKENS;

  const outputTokens =
    RANKING_OUTPUT_TOKENS +
    SYNTHESIS_OUTPUT_BASE +
    synthCount * SYNTHESIS_OUTPUT_PER_ARTICLE +
    SYNTHESIS_OUTPUT_TAIL;

  return { inputTokens, outputTokens };
}

export function estimateResearchRunCost(params: {
  provider: AIProviderSelection;
  model: string;
  topic: string;
  maxArticlesToScan: number;
  topNToSynthesize: number;
}): ResearchCostEstimate {
  const provider = params.provider ?? 'gemini';
  const model = params.model?.trim() || getProviderMeta(provider).defaultModel;
  const providerLabel = getProviderMeta(provider).label;
  const { inputTokens, outputTokens } = estimatePipelineTokens(
    provider,
    model,
    params.topic,
    params.maxArticlesToScan,
    params.topNToSynthesize,
  );

  const rate = resolveProviderRateQuote(provider, model);
  if (!rate) {
    return {
      provider,
      providerLabel,
      model,
      estimatedUsd: null,
      estimatedInputTokens: inputTokens,
      estimatedOutputTokens: outputTokens,
      currency: 'USD',
      pricingConfidence: 'unknown',
      pricingTierLabel: 'unknown',
    };
  }

  const estimatedUsd = computeUsdFromRates(inputTokens, outputTokens, rate);

  return {
    provider,
    providerLabel,
    model,
    estimatedUsd,
    estimatedInputTokens: inputTokens,
    estimatedOutputTokens: outputTokens,
    currency: 'USD',
    pricingConfidence: rate.confidence,
    pricingTierLabel: rate.tierLabel,
    pricingSource: rate.source,
    pricingAsOf: rate.asOf,
  };
}

/** @deprecated Use `estimateResearchRunCost` — kept for legacy call sites during migration. */
export function estimateResearchRunCostUsd(params: {
  topic: string;
  maxArticlesToScan: number;
  topNToSynthesize: number;
  model?: string;
  provider?: AIProviderSelection;
}): {
  estimatedUsd: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  tier: string;
} {
  const estimate = estimateResearchRunCost({
    provider: params.provider ?? 'gemini',
    model: params.model ?? 'gemini-2.5-flash',
    topic: params.topic,
    maxArticlesToScan: params.maxArticlesToScan,
    topNToSynthesize: params.topNToSynthesize,
  });
  return {
    estimatedUsd: estimate.estimatedUsd ?? 0,
    estimatedInputTokens: estimate.estimatedInputTokens,
    estimatedOutputTokens: estimate.estimatedOutputTokens,
    tier: estimate.pricingTierLabel,
  };
}

export function shouldWarnAboutResearchCost(
  estimateOrUsd: ResearchCostEstimate | number,
  thresholdUsd = 0.05,
): boolean {
  if (typeof estimateOrUsd === 'number') {
    return estimateOrUsd >= thresholdUsd;
  }
  if (estimateOrUsd.estimatedUsd == null) {
    return false;
  }
  return estimateOrUsd.estimatedUsd >= thresholdUsd;
}
