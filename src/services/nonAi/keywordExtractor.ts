/**
 * Keyword extractor for the Non-AI Programmatic Research Engine.
 * Extracts and aggregates keywords from articles using TF-IDF-like scoring.
 */

import type { RankedArticle, OverallKeyword } from '../../types';
import { tokenize, stem } from './utils';

/**
 * Extract keywords from a single article.
 */
export function extractKeywordsFromArticle(article: RankedArticle, limit: number = 10): string[] {
  const text = `${article.title} ${article.summary} ${(article.keywords ?? []).join(' ')}`;
  const tokens = tokenize(text, 'en');

  // Count term frequencies
  const termFreq = new Map<string, number>();
  for (const token of tokens) {
    const stemmed = stem(token.toLowerCase());
    termFreq.set(stemmed, (termFreq.get(stemmed) ?? 0) + 1);
  }

  // Sort by frequency and return top terms
  return [...termFreq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([term]) => term);
}

/**
 * Aggregate keywords across multiple articles.
 */
export function aggregateKeywords(articles: RankedArticle[], limit: number = 20): OverallKeyword[] {
  const keywordCounts = new Map<string, number>();

  for (const article of articles) {
    const keywords = article.keywords ?? extractKeywordsFromArticle(article);
    for (const kw of keywords) {
      const normalized = kw.toLowerCase().trim();
      if (normalized.length >= 3) {
        keywordCounts.set(normalized, (keywordCounts.get(normalized) ?? 0) + 1);
      }
    }
  }

  return [...keywordCounts.entries()]
    .map(([keyword, frequency]) => ({ keyword, frequency }))
    .sort((a, b) => b.frequency - a.frequency || a.keyword.localeCompare(b.keyword))
    .slice(0, limit);
}

/**
 * Extract n-grams for multi-word keyword detection.
 */
export function extractNgrams(text: string, n: number = 2): string[] {
  const tokens = tokenize(text, 'en');
  const ngrams: string[] = [];

  for (let i = 0; i <= tokens.length - n; i++) {
    const gram = tokens.slice(i, i + n).join(' ');
    if (gram.length >= 5) {
      ngrams.push(gram);
    }
  }

  return ngrams;
}
