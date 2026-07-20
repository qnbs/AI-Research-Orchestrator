/**
 * Curator for the Non-AI Programmatic Research Engine.
 * Deduplication, metadata cleaning, and enrichment.
 */

import type { RankedArticle } from '../../types';
import { normalizeText, tokenize } from './utils';

/** Curated article with cleaned metadata. */
export interface CuratedArticle extends RankedArticle {
  /** Duplicate check flag. */
  isDuplicate?: boolean;
  /** Original PMID if deduplicated. */
  originalPmid?: string;
}

/**
 * Deduplicate articles by PMID and normalized title.
 */
export function deduplicateArticles(articles: RankedArticle[]): CuratedArticle[] {
  const seenPmids = new Set<string>();
  const seenTitles = new Set<string>();
  const curated: CuratedArticle[] = [];

  for (const article of articles) {
    // Check PMID
    if (article.pmid && seenPmids.has(article.pmid)) {
      continue;
    }

    // Check normalized title
    const normalizedTitle = normalizeText(article.title);
    if (seenTitles.has(normalizedTitle)) {
      continue;
    }

    // Mark as seen
    if (article.pmid) seenPmids.add(article.pmid);
    seenTitles.add(normalizedTitle);

    curated.push({ ...article });
  }

  return curated;
}

/**
 * Clean and normalize article metadata.
 */
export function cleanArticleMetadata(article: RankedArticle): CuratedArticle {
  return {
    ...article,
    title: normalizeText(article.title),
    authors:
      article.authors
        ?.split(/[,;]/)
        .map((a) => a.trim())
        .filter((a) => a.length > 0)
        .join(', ') ?? '',
    journal: normalizeText(article.journal),
    summary: article.summary ? article.summary.replace(/\s+/g, ' ').trim() : '',
  };
}

/**
 * Clean all articles in a batch.
 */
export function cleanArticles(articles: RankedArticle[]): CuratedArticle[] {
  return articles.map(cleanArticleMetadata);
}

/**
 * Merge PubMed and arXiv articles with deduplication.
 */
export function mergeAndCurate(
  pubmedArticles: RankedArticle[],
  arxivArticles: RankedArticle[],
): CuratedArticle[] {
  const allArticles = [...pubmedArticles, ...arxivArticles];
  const cleaned = cleanArticles(allArticles);
  return deduplicateArticles(cleaned);
}

/**
 * Enrich articles with computed fields.
 */
export function enrichArticles(articles: CuratedArticle[]): CuratedArticle[] {
  return articles.map((article) => ({
    ...article,
    // Ensure all fields have defaults
    keywords: article.keywords ?? [],
    articleType: article.articleType ?? 'unknown',
    // Compute word count
    wordCount: article.summary ? tokenize(article.summary, 'en').length : 0,
  }));
}
