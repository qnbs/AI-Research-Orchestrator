import type { AggregatedArticle, ArticleSourceClass, RankedArticle } from '../types';
import { isArxivArticle } from './sourceIdentifier';

export type DashboardOpenAccessBucket = 'open' | 'closed' | 'unknown';

export type DashboardRetrievalSourceBucket = 'pubmed' | 'arxiv' | 'other';

type ArticleLike = RankedArticle | AggregatedArticle;

const RETRIEVAL_OTHER: ReadonlySet<ArticleSourceClass> = new Set([
  'user-imported',
  'demo-synthetic',
  'offline-placeholder',
]);

/**
 * Dashboard OA buckets — missing evidence is unknown, not toll "closed".
 * "Open" means arXiv or a corpus free-full-text flag (`isOpenAccess`, often PMC-linked),
 * not a legal OA rights determination (see dashboard.chart.oa_sub).
 */
export const classifyDashboardOpenAccess = (article: ArticleLike): DashboardOpenAccessBucket => {
  if (isArxivArticle(article) || article.sourceClass === 'arxiv-retrieved') {
    return 'open';
  }
  if (article.isOpenAccess) {
    return 'open';
  }
  return 'unknown';
};

/** Count OA buckets for pie/table export (stable key order). */
export const countDashboardOpenAccessBuckets = (
  articles: ReadonlyArray<ArticleLike>,
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
 * Retrieval provenance for dashboard — `sourceClass` wins over legacy PMID shape.
 * A PMID on an imported/demo record is not labeled verified PubMed retrieval.
 */
export const classifyDashboardRetrievalSource = (
  article: ArticleLike,
): DashboardRetrievalSourceBucket => {
  const sourceClass = article.sourceClass;
  if (sourceClass === 'arxiv-retrieved') return 'arxiv';
  if (sourceClass === 'pubmed-retrieved') return 'pubmed';
  if (sourceClass && RETRIEVAL_OTHER.has(sourceClass)) return 'other';

  if (isArxivArticle(article)) return 'arxiv';
  if (
    article.retrievalSource === 'pubmed_efetch' ||
    article.retrievalSource === 'pubmed_esummary'
  ) {
    return 'pubmed';
  }
  return 'other';
};

export const countDashboardRetrievalSources = (
  articles: ReadonlyArray<ArticleLike>,
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

/** Stable pie colors keyed by bucket (not slice index). */
export const DASHBOARD_SOURCE_BUCKET_COLORS: Record<DashboardRetrievalSourceBucket, string> = {
  pubmed: '#1f6feb',
  arxiv: '#a371f7',
  other: '#7d8590',
};

export const DASHBOARD_OA_BUCKET_COLORS: Record<DashboardOpenAccessBucket, string> = {
  open: '#34d399',
  unknown: '#fbbf24',
  closed: '#7d8590',
};
