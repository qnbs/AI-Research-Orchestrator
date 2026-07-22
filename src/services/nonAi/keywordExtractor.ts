/**
 * Keyword extractor for the Non-AI Programmatic Research Engine.
 * Extracts and aggregates keywords from articles using TF-IDF-like scoring.
 */

import type { RankedArticle, OverallKeyword } from '../../types';
import { tokenize } from './utils';

/**
 * Extract keywords from arbitrary text.
 *
 * Returns surface-form terms (not stemmed) since these are displayed directly
 * to the user as keyword chips - a stemmed form like "hyperten" or "diabet"
 * would be unreadable. Bigrams get a slight scoring boost to prefer
 * multi-word terms, matching the weighting used for cross-article n-gram
 * aggregation below.
 */
export function extractKeywordsFromText(text: string, limit: number = 8): string[] {
  const tokens = tokenize(text, 'en');
  const bigrams = extractNgrams(text, 2);

  const scores = new Map<string, number>();
  for (const token of tokens) {
    const term = token.toLowerCase();
    scores.set(term, (scores.get(term) ?? 0) + 1);
  }
  for (const bigram of bigrams) {
    scores.set(bigram, (scores.get(bigram) ?? 0) + 1.5);
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([term]) => term);
}

/** Extract keywords from a single article's title, summary, and existing keywords. */
export function extractKeywordsFromArticle(article: RankedArticle, limit: number = 10): string[] {
  const text = `${article.title} ${article.summary} ${(article.keywords ?? []).join(' ')}`;
  return extractKeywordsFromText(text, limit);
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
