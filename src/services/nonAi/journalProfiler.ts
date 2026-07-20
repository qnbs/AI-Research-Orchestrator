/**
 * Journal profiler for the Non-AI Programmatic Research Engine.
 * Analyzes journal metrics and suggests relevant journals for a field.
 */

import type { JournalProfile, RankedArticle } from '../../types';
import { tokenize } from './utils';

/**
 * Analyze journal metrics from articles.
 */
export function analyzeJournalMetrics(articles: RankedArticle[]): {
  journal: string;
  articleCount: number;
  openAccessCount: number;
  avgRelevance: number;
}[] {
  const journalStats = new Map<
    string,
    {
      count: number;
      openAccess: number;
      totalRelevance: number;
    }
  >();

  for (const article of articles) {
    const journal = article.journal ?? 'Unknown';
    const stats = journalStats.get(journal) ?? { count: 0, openAccess: 0, totalRelevance: 0 };
    stats.count++;
    stats.totalRelevance += article.relevanceScore ?? 0;
    if (article.isOpenAccess) stats.openAccess++;
    journalStats.set(journal, stats);
  }

  return [...journalStats.entries()]
    .map(([journal, stats]) => ({
      journal,
      articleCount: stats.count,
      openAccessCount: stats.openAccess,
      avgRelevance: stats.totalRelevance / stats.count,
    }))
    .sort((a, b) => b.articleCount - a.articleCount || b.avgRelevance - a.avgRelevance);
}

/**
 * Generate a journal profile from articles.
 */
export function generateJournalProfile(
  journalName: string,
  articles: RankedArticle[],
): JournalProfile {
  const journalArticles = articles.filter(
    (a) => a.journal?.toLowerCase() === journalName.toLowerCase(),
  );

  const openAccessRate =
    journalArticles.length > 0
      ? (journalArticles.filter((a) => a.isOpenAccess).length / journalArticles.length) * 100
      : null;

  const typeCounts = new Map<string, number>();
  for (const a of journalArticles) {
    const type = a.articleType ?? 'Unknown';
    typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
  }

  const focusAreas = [...typeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type]) => type);

  return {
    name: journalName,
    issn: '', // Would need curated data
    description: `Journal profile based on ${journalArticles.length} analyzed articles.`,
    oaPolicy: openAccessRate && openAccessRate > 50 ? 'Full Open Access' : 'Hybrid',
    focusAreas,
    publisher: 'Unknown',
  };
}

/**
 * Suggest journals for a field of study.
 */
export function suggestJournalsForField(fieldOfStudy: string, articles: RankedArticle[]): string[] {
  const fieldTokens = tokenize(fieldOfStudy, 'en');
  const journalScores = new Map<string, number>();

  for (const article of articles) {
    const journal = article.journal ?? '';
    if (!journal) continue;

    const journalTokens = tokenize(journal, 'en');
    const overlap = fieldTokens.filter((t) => journalTokens.includes(t)).length;
    journalScores.set(journal, (journalScores.get(journal) ?? 0) + overlap);
  }

  return [...journalScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([journal]) => journal);
}
