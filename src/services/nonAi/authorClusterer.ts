/**
 * Author clustering for the Non-AI Programmatic Research Engine.
 * Groups publications by co-author overlap and topic similarity.
 */

import type { AuthorCluster, RankedArticle } from '../../types';
import { tokenize, jaccardSimilarity } from './utils';

/**
 * Parse author list from PubMed format.
 */
function parseAuthorList(authors: string | undefined): string[] {
  if (!authors) return [];
  return authors
    .split(/,|;|\sand\s/i)
    .map((a) => a.trim())
    .filter((a) => a.length > 1 && !/^et\s+al/i.test(a));
}

/**
 * Normalize author name for comparison.
 */
function normalizeAuthorKey(name: string): string {
  return name.trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ');
}

/**
 * Check if candidate is the same author as target.
 */
function isSameAuthorIdentity(candidate: string, targetName: string): boolean {
  const c = normalizeAuthorKey(candidate);
  const t = normalizeAuthorKey(targetName);
  if (!c || !t) return false;
  if (c === t) return true;

  const cParts = c.split(' ');
  const tParts = t.split(' ');
  const cSurname = cParts[0];
  const tSurname = tParts[0];
  if (cSurname !== tSurname) return false;
  if (tParts.length === 1 || cParts.length === 1) return true;
  return cParts[1][0] === tParts[1][0];
}

/**
 * Extract affiliation tokens from article.
 */
function affiliationTokens(article: RankedArticle): Set<string> {
  return new Set(tokenize(`${article.journal ?? ''} ${article.title ?? ''}`, 'en'));
}

/**
 * Cluster publications by co-author overlap + title similarity.
 */
export function clusterAuthorArticles(
  authorName: string,
  articles: RankedArticle[],
): AuthorCluster[] {
  if (articles.length === 0) {
    return [
      {
        nameVariant: authorName,
        primaryAffiliation: 'Unknown (insufficient data)',
        topCoAuthors: [],
        coreTopics: [],
        publicationCount: 0,
        pmids: [],
      },
    ];
  }

  const clusters: { articles: RankedArticle[]; seeds: Set<string> }[] = [];

  for (const article of articles) {
    const coAuthors = parseAuthorList(article.authors).filter(
      (a) => !isSameAuthorIdentity(a, authorName),
    );
    const titleTokens = tokenize(article.title ?? '', 'en');
    const aff = affiliationTokens(article);
    const fingerprint = new Set([...coAuthors.map((c) => c.toLowerCase()), ...titleTokens, ...aff]);

    let bestIdx = -1;
    let bestSim = 0;
    for (let i = 0; i < clusters.length; i++) {
      const sim = jaccardSimilarity([...fingerprint], [...clusters[i].seeds]);
      if (sim > bestSim) {
        bestSim = sim;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0 && bestSim >= 0.12) {
      clusters[bestIdx].articles.push(article);
      for (const t of fingerprint) clusters[bestIdx].seeds.add(t);
    } else {
      clusters.push({ articles: [article], seeds: fingerprint });
    }
  }

  return clusters.map((c) => {
    const coFreq = new Map<string, number>();
    const topicBag = new Map<string, number>();
    for (const a of c.articles) {
      for (const co of parseAuthorList(a.authors)) {
        if (isSameAuthorIdentity(co, authorName)) continue;
        coFreq.set(co, (coFreq.get(co) ?? 0) + 1);
      }
      const titleTokens = tokenize(a.title ?? '', 'en');
      for (const t of titleTokens) {
        topicBag.set(t, (topicBag.get(t) ?? 0) + 1);
      }
    }

    const topCoAuthors = [...coFreq.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([name]) => name);

    const coreTopics = [...topicBag.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([topic]) => topic);

    return {
      nameVariant: authorName,
      primaryAffiliation: c.articles[0]?.journal ?? 'Unknown',
      topCoAuthors,
      coreTopics,
      publicationCount: c.articles.length,
      pmids: c.articles.map((a) => a.pmid),
    };
  });
}

/**
 * Get author profile summary.
 */
export function getAuthorProfileSummary(
  _authorName: string,
  articles: RankedArticle[],
): {
  totalPapers: number;
  avgRelevance: number;
  topVenue: string;
  recentActivity: number;
} {
  const totalPapers = articles.length;
  const avgRelevance =
    articles.reduce((sum, a) => sum + (a.relevanceScore ?? 0), 0) / totalPapers || 0;
  const venueCounts = new Map<string, number>();
  for (const a of articles) {
    if (a.journal) {
      venueCounts.set(a.journal, (venueCounts.get(a.journal) ?? 0) + 1);
    }
  }
  const topVenue = [...venueCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Unknown';
  const currentYear = new Date().getFullYear();
  const recentActivity = articles.filter((a) => {
    const year = parseInt(a.pubYear, 10);
    return year >= currentYear - 2;
  }).length;

  return {
    totalPapers,
    avgRelevance,
    topVenue,
    recentActivity,
  };
}
