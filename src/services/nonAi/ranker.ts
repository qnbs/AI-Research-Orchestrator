/**
 * Ranker for the Non-AI Programmatic Research Engine.
 * BM25/TF-IDF hybrid scoring with feature boosts and explanations.
 */

import type { RankedArticle } from '../../types';
import type { RankingWeights, ScoringExplanation } from './types';
import {
  tokenize,
  stem,
  bm25Score,
  recencyDecayFactor,
  isHighQualityPubType,
  normalizeScore,
} from './utils';
import { DEFAULT_RANKING_WEIGHTS } from './types';
import { findMeshTermsInQuery } from './meshDictionary';

/** Ranked article with scoring details. */
export interface RankedArticleWithExplanation extends RankedArticle {
  scoringExplanation?: ScoringExplanation;
}

/**
 * Rank articles using BM25/TF-IDF hybrid with feature boosts.
 */
export function rankArticles(
  articles: RankedArticle[],
  query: string,
  weights: Partial<RankingWeights> = {},
): RankedArticleWithExplanation[] {
  const finalWeights: RankingWeights = { ...DEFAULT_RANKING_WEIGHTS, ...weights };
  const queryTokens = tokenize(query, 'en');
  const queryMeshTerms = findMeshTermsInQuery(query);

  // Calculate document frequencies for IDF
  const docLengths = articles.map((a) => tokenize(`${a.title} ${a.summary}`, 'en').length);
  const avgDocLength = docLengths.reduce((sum, len) => sum + len, 0) / articles.length || 150;

  // Calculate scores
  const scoredArticles = articles.map((article, index) => {
    const docTokens = tokenize(`${article.title} ${article.summary}`, 'en');
    const docLength = docLengths[index];

    // BM25 score
    let bm25Total = 0;
    const termCounts = new Map<string, number>();

    for (const token of queryTokens) {
      const stemmed = stem(token.toLowerCase());
      const count = docTokens.filter((t) => stem(t) === stemmed).length;
      termCounts.set(stemmed, count);
    }

    for (const [_term, count] of termCounts) {
      const idf = Math.log(articles.length / (1 + count));
      bm25Total += bm25Score(count / docLength, docLength, avgDocLength, idf);
    }

    // Feature scores
    const meshOverlap = calculateMeshOverlap(article, queryMeshTerms);
    const pubTypeBoost = isHighQualityPubType([article.articleType ?? '']) ? 1 : 0;
    const recency = recencyDecayFactor(article.pubYear);
    const oaBonus = article.isOpenAccess ? 1 : 0;
    const keywordDensity = calculateKeywordDensity(article, queryTokens);

    // Combined score
    const rawScore =
      bm25Total * 0.4 +
      meshOverlap * finalWeights.meshOverlap * 100 +
      pubTypeBoost * finalWeights.pubTypeBoost * 100 +
      recency * finalWeights.recencyDecay * 100 +
      oaBonus * finalWeights.openAccess * 100 +
      keywordDensity * finalWeights.keywordDensity * 100;

    const explanation: ScoringExplanation = {
      baseScore: bm25Total * 10,
      meshOverlap,
      pubTypeBoost,
      recencyDecay: recency,
      openAccess: oaBonus,
      keywordDensity,
      explanation: buildExplanation(meshOverlap, pubTypeBoost, recency, oaBonus, keywordDensity),
    };

    return {
      ...article,
      relevanceScore: Math.round(normalizeScore(rawScore, 0, 100)),
      relevanceExplanation: explanation.explanation,
      scoringExplanation: explanation,
    };
  });

  // Sort by score descending
  return scoredArticles.sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
}

/** Calculate MeSH overlap score. */
function calculateMeshOverlap(article: RankedArticle, queryMeshTerms: string[]): number {
  if (queryMeshTerms.length === 0) return 0.5;

  // Check if article has MeSH headings
  const articleMesh = (article as { meshHeadings?: string[] }).meshHeadings ?? [];
  if (articleMesh.length === 0) return 0.3;

  const overlap = queryMeshTerms.filter((qm) =>
    articleMesh.some((am) => am.toLowerCase().includes(qm.toLowerCase())),
  ).length;

  return overlap / queryMeshTerms.length;
}

/** Calculate keyword density score. */
function calculateKeywordDensity(article: RankedArticle, queryTokens: string[]): number {
  const docTokens = tokenize(`${article.title} ${article.summary}`, 'en');
  const stemmedQuery = queryTokens.map((t) => stem(t.toLowerCase()));

  let matches = 0;
  for (const token of docTokens) {
    if (stemmedQuery.includes(stem(token.toLowerCase()))) {
      matches++;
    }
  }

  return docTokens.length > 0 ? matches / docTokens.length : 0;
}

/** Build human-readable explanation. */
function buildExplanation(
  meshOverlap: number,
  pubTypeBoost: number,
  recency: number,
  oaBonus: number,
  keywordDensity: number,
): string {
  const parts: string[] = [];

  if (meshOverlap > 0.5) {
    parts.push('strong MeSH match');
  } else if (meshOverlap > 0) {
    parts.push('partial MeSH match');
  }

  if (pubTypeBoost > 0) {
    parts.push('high-quality study type');
  }

  if (recency > 0.7) {
    parts.push('recent publication');
  } else if (recency > 0.4) {
    parts.push('moderately recent');
  }

  if (oaBonus > 0) {
    parts.push('open access');
  }

  if (keywordDensity > 0.1) {
    parts.push('high keyword density');
  }

  return parts.length > 0 ? `Ranked: ${parts.join(', ')}.` : 'Ranked: baseline relevance.';
}

/**
 * Get top N articles by score.
 */
export function getTopArticles(
  rankedArticles: RankedArticleWithExplanation[],
  count: number = 10,
): RankedArticleWithExplanation[] {
  return rankedArticles.slice(0, count);
}
