import { meaningfulTokens, ngrams } from './utils';

/**
 * Frequency + bigram keyword extraction (deterministic).
 * Returns up to `limit` keywords sorted by score then alphabetically.
 */
export function extractKeywords(text: string, limit = 8): string[] {
  const unigrams = meaningfulTokens(text);
  const bigrams = ngrams(text, 2);

  const scores = new Map<string, number>();
  for (const t of unigrams) {
    scores.set(t, (scores.get(t) ?? 0) + 1);
  }
  for (const bg of bigrams) {
    // Prefer multi-word terms slightly
    scores.set(bg, (scores.get(bg) ?? 0) + 1.5);
  }

  return [...scores.entries()]
    .filter(([term]) => term.length >= 3)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([term]) => term);
}
