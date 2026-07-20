/**
 * Similar article finder for the Non-AI Programmatic Research Engine.
 * Uses Jaccard similarity on token overlap for finding related articles.
 */

import type { SimilarArticle, RankedArticle } from '../../types';
import { tokenize, jaccardSimilarity } from './utils';

/**
 * Find similar articles based on Jaccard similarity.
 */
export function findSimilarArticles(
  seed: { title: string; summary: string; keywords?: string[]; pmid?: string },
  candidates: RankedArticle[],
  limit: number = 5,
): SimilarArticle[] {
  const seedText = `${seed.title} ${seed.summary} ${(seed.keywords ?? []).join(' ')}`;
  const seedTokens = tokenize(seedText, 'en');
  const seedPmid = seed.pmid?.trim();
  const seedTitle = seed.title.trim().toLowerCase();

  const scored = candidates
    .filter((c) => {
      if (!(c.title || c.summary)) return false;
      if (seedPmid && c.pmid === seedPmid) return false;
      if (c.title.trim().toLowerCase() === seedTitle) return false;
      return true;
    })
    .map((c) => {
      const otherText = `${c.title} ${c.summary} ${(c.keywords ?? []).join(' ')}`;
      const otherTokens = tokenize(otherText, 'en');
      const sim = jaccardSimilarity(seedTokens, otherTokens);
      return {
        pmid: c.pmid,
        title: c.title,
        reason: `Non-AI Jaccard ${(sim * 100).toFixed(0)}% token overlap with seed.`,
        sim,
      };
    })
    .filter((x) => x.sim > 0)
    .sort((a, b) => b.sim - a.sim || a.pmid.localeCompare(b.pmid))
    .slice(0, limit);

  return scored.map(({ pmid, title, reason }) => ({ pmid, title, reason }));
}

/**
 * Find similar articles with score threshold.
 */
export function findSimilarArticlesWithThreshold(
  seed: { title: string; summary: string; keywords?: string[]; pmid?: string },
  candidates: RankedArticle[],
  minSimilarity: number = 0.1,
  limit: number = 10,
): SimilarArticle[] {
  return findSimilarArticles(seed, candidates, limit).filter(
    (a) => a.reason && parseFloat(a.reason.match(/(\d+)%/)?.[1] ?? '0') >= minSimilarity * 100,
  );
}
