/**
 * Corpus-bound citation validation for research reports.
 * Ensures PMIDs cited in insights and rankings belong to the retrieved article set.
 */

import type { ResearchReport } from '../types';

export interface CitationValidationMetrics {
  /** Citations present in the corpus. */
  validCitations: number;
  /** Citations rejected (unknown or outside corpus). */
  invalidCitations: number;
  /** Insights that lost all supporting articles after sanitization. */
  emptyInsights: number;
  /** Ranked articles removed because PMID was not in corpus. */
  droppedRankedArticles: number;
}

export interface CitationGroundingResult {
  insights: ResearchReport['aiGeneratedInsights'];
  rankedArticles: ResearchReport['rankedArticles'];
  metrics: CitationValidationMetrics;
  /** True when every material citation passed corpus validation. */
  fullyGrounded: boolean;
}

/** Partition citation IDs into corpus-valid and invalid sets. */
export function partitionCorpusCitations(
  corpusIds: ReadonlySet<string>,
  citations: readonly string[],
): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  for (const raw of citations) {
    const id = raw.trim();
    if (id.length === 0) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    if (corpusIds.has(id)) {
      valid.push(id);
    } else {
      invalid.push(id);
    }
  }

  return { valid, invalid };
}

/**
 * Sanitize AI-generated insights so supportingArticles only reference the retrieval corpus.
 * Insights with no valid supporting articles after filtering are dropped.
 */
export function sanitizeInsightsAgainstCorpus(
  insights: ResearchReport['aiGeneratedInsights'],
  corpusIds: ReadonlySet<string>,
): {
  insights: ResearchReport['aiGeneratedInsights'];
  metrics: Pick<CitationValidationMetrics, 'validCitations' | 'invalidCitations' | 'emptyInsights'>;
} {
  let validCitations = 0;
  let invalidCitations = 0;
  let emptyInsights = 0;

  const sanitized = insights
    .map((insight) => {
      const { valid, invalid } = partitionCorpusCitations(
        corpusIds,
        insight.supportingArticles ?? [],
      );
      validCitations += valid.length;
      invalidCitations += invalid.length;
      return { ...insight, supportingArticles: valid };
    })
    .filter((insight) => {
      if (insight.supportingArticles.length === 0) {
        emptyInsights += 1;
        return false;
      }
      return true;
    });

  return {
    insights: sanitized,
    metrics: { validCitations, invalidCitations, emptyInsights },
  };
}

/** Drop ranked articles whose PMID is not in the retrieval corpus. */
export function filterRankedArticlesToCorpus<T extends { pmid: string }>(
  ranked: T[],
  corpusIds: ReadonlySet<string>,
): { ranked: T[]; dropped: number } {
  const filtered = ranked.filter((a) => corpusIds.has(a.pmid));
  return { ranked: filtered, dropped: ranked.length - filtered.length };
}

/** Full grounding pass for ranking analysis output. */
export function applyCorpusCitationGrounding(
  corpusPmids: readonly string[],
  rankedArticles: ResearchReport['rankedArticles'],
  insights: ResearchReport['aiGeneratedInsights'],
): CitationGroundingResult {
  const corpusIds = new Set(corpusPmids);

  const { ranked, dropped } = filterRankedArticlesToCorpus(rankedArticles, corpusIds);
  const { insights: groundedInsights, metrics: insightMetrics } = sanitizeInsightsAgainstCorpus(
    insights,
    corpusIds,
  );

  const metrics: CitationValidationMetrics = {
    ...insightMetrics,
    droppedRankedArticles: dropped,
  };

  const fullyGrounded =
    metrics.invalidCitations === 0 &&
    metrics.droppedRankedArticles === 0 &&
    metrics.emptyInsights === 0;

  return {
    insights: groundedInsights,
    rankedArticles: ranked,
    metrics,
    fullyGrounded,
  };
}

/** Eval-style metrics for citation quality (offline harness). */
export function measureCitationGrounding(
  corpusIds: ReadonlySet<string>,
  insights: ResearchReport['aiGeneratedInsights'],
): {
  citationValidity: number;
  citationCompleteness: number;
  unsupportedInsightRate: number;
} {
  if (insights.length === 0) {
    return { citationValidity: 1, citationCompleteness: 1, unsupportedInsightRate: 0 };
  }

  let totalCitations = 0;
  let validCitations = 0;
  let insightsWithSupport = 0;

  for (const insight of insights) {
    const cites = insight.supportingArticles ?? [];
    if (cites.length > 0) insightsWithSupport += 1;
    for (const id of cites) {
      totalCitations += 1;
      if (corpusIds.has(id.trim())) validCitations += 1;
    }
  }

  return {
    citationValidity: totalCitations === 0 ? 0 : validCitations / totalCitations,
    citationCompleteness: insightsWithSupport / insights.length,
    unsupportedInsightRate: 1 - insightsWithSupport / insights.length,
  };
}
