import type { AggregatedArticle, RankedArticle } from '../types';
import { isArxivArticle, resolveArticleId } from './sourceIdentifier';

export type DashboardOpenAccessBucket = 'open' | 'closed' | 'unknown';

export type DashboardRetrievalSourceBucket = 'pubmed' | 'arxiv' | 'other';

/**
 * Dashboard OA chart buckets — do not treat missing PMC/OA evidence as toll "closed" access.
 * arXiv and explicit `isOpenAccess` count as open; absent evidence is unknown.
 */
export const classifyDashboardOpenAccess = (
  article: RankedArticle | AggregatedArticle,
): DashboardOpenAccessBucket => {
  if (isArxivArticle(article)) return 'open';
  if (article.isOpenAccess) return 'open';
  return 'unknown';
};

/** Count OA buckets for pie/table export (stable key order). */
export const countDashboardOpenAccessBuckets = (
  articles: ReadonlyArray<RankedArticle | AggregatedArticle>,
): Record<DashboardOpenAccessBucket, number> => {
  const counts: Record<DashboardOpenAccessBucket, number> = {
    open: 0,
    closed: 0,
    unknown: 0,
  };
  for (const article of articles) {
    counts[classifyDashboardOpenAccess(article)] += 1;
  }
  return counts;
};

/**
 * Source distribution for dashboard — arXiv vs PubMed-retrieved vs other/imported/demo.
 */
export const classifyDashboardRetrievalSource = (
  article: RankedArticle | AggregatedArticle,
): DashboardRetrievalSourceBucket => {
  if (isArxivArticle(article)) return 'arxiv';
  const id = resolveArticleId(article);
  if (id.type === 'pmid') return 'pubmed';
  return 'other';
};

export const countDashboardRetrievalSources = (
  articles: AggregatedArticle[] | RankedArticle[],
): Record<DashboardRetrievalSourceBucket, number> => {
  const counts: Record<DashboardRetrievalSourceBucket, number> = {
    pubmed: 0,
    arxiv: 0,
    other: 0,
  };
  for (const article of articles) {
    counts[classifyDashboardRetrievalSource(article)] += 1;
  }
  return counts;
};
