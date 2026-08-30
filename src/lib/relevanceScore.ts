/**
 * Display-scale relevance helpers.
 *
 * RankedArticle.relevanceScore is an integer 0–100 (never a 0–1 fraction).
 * Heuristic ranking min-maxes BM25+ feature mix within the current result set —
 * it is a relative rank, not a calibrated probability.
 */

export type RelevanceBand = 'high' | 'medium' | 'possible' | 'low';

/** Thresholds on the 0–100 display scale. */
export const RELEVANCE_BAND_THRESHOLDS = {
  high: 85,
  medium: 70,
  possible: 50,
  /** Amber accent below "possible"; below this is a non-semantic bar. */
  accent: 30,
} as const;

/** Map a 0–100 display score to a high / medium / possible / low band. */
export function relevanceBand(score: number): RelevanceBand {
  if (score >= RELEVANCE_BAND_THRESHOLDS.high) return 'high';
  if (score >= RELEVANCE_BAND_THRESHOLDS.medium) return 'medium';
  if (score >= RELEVANCE_BAND_THRESHOLDS.possible) return 'possible';
  return 'low';
}

/** Honest chat phrasing: relative rank, not a calibrated /100 probability. */
export function formatRelativeRelevanceScore(score: number): string {
  return `relative score ${score} (this result set)`;
}

/** Shared ring/text colors so the score ring matches Knowledge Base bands. */
export function relevanceBandChrome(score: number): { textClass: string; ringColor: string } {
  const band = relevanceBand(score);
  if (band === 'high') return { textClass: 'text-green-400', ringColor: '#4ade80' };
  if (band === 'medium') return { textClass: 'text-cyan-400', ringColor: '#22d3ee' };
  if (band === 'possible') return { textClass: 'text-amber-400', ringColor: '#fbbf24' };
  return { textClass: 'text-red-400', ringColor: '#f87171' };
}
