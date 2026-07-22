/**
 * Curator for the Non-AI Programmatic Research Engine.
 * Deduplication, metadata cleaning, and enrichment.
 */

import type { RankedArticle } from '../../types';
import { normalizeText, tokenize } from './utils';

/** Simple publication-type classifier from title/abstract cues. */
export function classifyArticleType(title: string, summary: string): string {
  const blob = `${title} ${summary}`.toLowerCase();
  if (/meta-?analysis|meta analysis/.test(blob)) return 'Meta-Analysis';
  if (/systematic review/.test(blob)) return 'Systematic Review';
  if (/randomized|randomised|rct\b|placebo-controlled/.test(blob))
    return 'Randomized Controlled Trial';
  if (/cohort|case-control|observational|cross-sectional/.test(blob)) return 'Observational Study';
  if (/review\b/.test(blob)) return 'Review';
  return 'Other';
}

/** Build a short extractive summary (first/middle/last sentence) from an abstract. */
function buildExtractiveSummary(abstract: string, title: string): string {
  const sentences = abstract
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length === 0) {
    return `Summary of "${title}": abstract unavailable; relevance based on title tokens only.`;
  }
  const first = sentences[0];
  const last = sentences.length > 1 ? sentences[sentences.length - 1] : '';
  const mid = sentences.length > 2 ? sentences[Math.floor(sentences.length / 2)] : '';
  return [first, mid, last].filter(Boolean).join(' ').slice(0, 600);
}

/** Curated article with cleaned metadata. */
export interface CuratedArticle extends RankedArticle {
  /** Duplicate check flag. */
  isDuplicate?: boolean;
  /** Original PMID if deduplicated. */
  originalPmid?: string;
  /** Computed word count. */
  wordCount?: number;
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

    // Check normalized title (only for non-empty titles)
    const normalizedTitle = normalizeText(article.title);
    if (normalizedTitle && seenTitles.has(normalizedTitle)) {
      continue;
    }

    // Mark as seen
    if (article.pmid) seenPmids.add(article.pmid);
    if (normalizedTitle) seenTitles.add(normalizedTitle);

    curated.push({ ...article });
  }

  return curated;
}

/**
 * Clean and normalize article metadata.
 * Note: Title and journal are preserved for display; normalized values used only for deduplication.
 */
export function cleanArticleMetadata(article: RankedArticle): CuratedArticle {
  return {
    ...article,
    title: article.title.trim(),
    authors:
      article.authors
        ?.split(/[,;]/)
        .map((a) => a.trim())
        .filter((a) => a.length > 0)
        .join(', ') ?? '',
    journal: article.journal.trim(),
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
 * Enrich articles with computed fields: word count, a classified article type
 * (feeds the ranker's pub-type boost - it does nothing if this stays a
 * placeholder), and a short extractive summary for display when the source
 * has no AI-generated one.
 */
export function enrichArticles(articles: CuratedArticle[]): CuratedArticle[] {
  return articles.map((article) => ({
    ...article,
    keywords: article.keywords ?? [],
    articleType: article.articleType ?? classifyArticleType(article.title, article.summary),
    aiSummary: article.aiSummary ?? buildExtractiveSummary(article.summary, article.title),
    wordCount: article.summary ? tokenize(article.summary, 'en').length : 0,
  }));
}
