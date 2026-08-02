import type { AuthorCluster } from '../types';

export type InsightKeyInput = {
  question: string;
  answer: string;
  supportingArticles: string[];
};

/** Stable React key for author disambiguation clusters (PMID set is the domain identity). */
export function stableAuthorClusterKey(cluster: AuthorCluster): string {
  const pmidKey = [...cluster.pmids].sort((a, b) => a.localeCompare(b, 'en')).join(',');
  return `${cluster.nameVariant}|${cluster.primaryAffiliation}|${pmidKey}`;
}

/** Stable React key when duplicate questions can appear across reports or within one report. */
export function stableInsightKey(insight: InsightKeyInput): string {
  const pmids = [...(insight.supportingArticles ?? [])]
    .sort((a, b) => a.localeCompare(b, 'en'))
    .join(',');
  return `${pmids}|${insight.question}|${insight.answer}`;
}
