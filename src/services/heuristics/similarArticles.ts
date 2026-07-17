import type { SimilarArticle, RankedArticle } from '../../types';
import { jaccard, tokenSet, throwIfAborted } from './utils';

/**
 * Rank candidate articles by Jaccard similarity on keyword / title+abstract tokens.
 * Returns Gemini-compatible `SimilarArticle[]`.
 */
export function findSimilarArticlesHeuristic(
  seed: { title: string; summary: string; keywords?: string[]; pmid?: string },
  candidates: Array<Pick<RankedArticle, 'pmid' | 'title' | 'summary' | 'keywords'>>,
  limit = 5,
  signal?: AbortSignal,
): SimilarArticle[] {
  throwIfAborted(signal);
  const seedText = `${seed.title} ${seed.summary} ${(seed.keywords ?? []).join(' ')}`;
  const seedSet = tokenSet(seedText);
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
      const other = tokenSet(`${c.title} ${c.summary} ${(c.keywords ?? []).join(' ')}`);
      const sim = jaccard(seedSet, other);
      return {
        pmid: c.pmid,
        title: c.title,
        reason: `Heuristic Jaccard ${(sim * 100).toFixed(0)}% token overlap with seed title/abstract.`,
        sim,
      };
    })
    .filter((x) => x.sim > 0)
    .sort((a, b) => b.sim - a.sim || a.pmid.localeCompare(b.pmid))
    .slice(0, limit);

  return scored.map(({ pmid, title, reason }) => ({ pmid, title, reason }));
}
