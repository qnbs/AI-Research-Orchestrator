import type { AuthorCluster } from '../types';
import { compareEnLocale } from './stringCompare';

export type InsightKeyInput = {
  question: string;
  answer: string;
  supportingArticles: string[];
};

function sortPmids(pmids: string[]): string[] {
  return [...pmids].sort(compareEnLocale);
}

/** Collision-safe composite key for React list identity (delimiter-safe via JSON). */
function compositeStableKey(parts: string[]): string {
  return JSON.stringify(parts);
}

/** Stable React key for author disambiguation clusters (PMID set is the domain identity). */
export const stableAuthorClusterKey = (cluster: AuthorCluster): string => {
  const pmidKey = sortPmids(cluster.pmids).join(',');
  return compositeStableKey([cluster.nameVariant, cluster.primaryAffiliation, pmidKey]);
};

/** Stable React key when duplicate questions can appear across reports or within one report. */
export const stableInsightKey = (insight: InsightKeyInput): string => {
  const pmids = sortPmids(insight.supportingArticles ?? []).join(',');
  return compositeStableKey([pmids, insight.question, insight.answer]);
};
