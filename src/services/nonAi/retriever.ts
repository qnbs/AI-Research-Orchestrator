/**
 * Retriever for the Non-AI Programmatic Research Engine.
 * Orchestrates PubMed E-utilities and arXiv retrieval with batching and rate limiting.
 */

import type { RankedArticle } from '../../types';
import type { RetrievalResult, BuiltQuery } from './types';
import { searchPubMedForIds, fetchArticleDetails } from '../pubmedUtils';
import { searchAndFetchArxiv } from '../arxivUtils';
import { getNcbiApiKey } from '../apiKeyService';
import { AppError, toAppError } from '../../lib/errors';
import { withCircuitBreaker } from '../../lib/circuitBreaker';

/** Retrieval options. */
export interface RetrievalOptions {
  /** Maximum articles to retrieve from PubMed. */
  maxPubmed?: number;
  /** Maximum articles to retrieve from arXiv. */
  maxArxiv?: number;
  /** Include related articles via elink. */
  includeRelated?: boolean;
  /** Signal for cancellation. */
  signal?: AbortSignal;
}

/**
 * Retrieve articles from PubMed and arXiv based on built queries.
 */
export async function retrieveArticles(
  queries: BuiltQuery[],
  options: RetrievalOptions = {},
): Promise<RetrievalResult> {
  const maxPubmed = options.maxPubmed ?? 20;
  const maxArxiv = options.maxArxiv ?? 10;
  const allPmids = new Set<string>();
  const allArticles: RankedArticle[] = [];
  let apiCalls = 0;

  // Get NCBI API key if available
  let ncbiApiKey: string | null = null;
  try {
    ncbiApiKey = await getNcbiApiKey();
  } catch {
    // Continue without API key
  }

  // Search PubMed for each query
  for (const builtQuery of queries) {
    if (options.signal?.aborted) {
      throw new AppError({
        code: 'STREAM_ABORTED',
        message: 'Retrieval aborted',
        retryable: false,
      });
    }

    try {
      const pmidBatch = await withCircuitBreaker('pubmed-search', () =>
        searchPubMedForIds(builtQuery.query, maxPubmed, options.signal, ncbiApiKey ?? undefined),
      );
      apiCalls++;

      for (const pmid of pmidBatch) {
        if (!allPmids.has(pmid)) {
          allPmids.add(pmid);
        }
      }
    } catch (error) {
      // Continue with other queries on failure
      console.warn(`Query failed: ${builtQuery.query}`, error);
    }
  }

  // Fetch article details in batches
  const pmidArray = [...allPmids].slice(0, maxPubmed);
  if (pmidArray.length > 0) {
    try {
      const articles = await withCircuitBreaker('pubmed-fetch', () =>
        fetchArticleDetails(pmidArray, options.signal, ncbiApiKey ?? undefined),
      );
      apiCalls++;
      // Convert Partial<RankedArticle> to RankedArticle with defaults
      allArticles.push(
        ...articles.map((a) => ({
          pmid: a.pmid ?? '',
          pmcId: a.pmcId,
          title: a.title ?? '',
          authors: a.authors ?? '',
          journal: a.journal ?? '',
          pubYear: a.pubYear ?? '',
          summary: a.summary ?? '',
          relevanceScore: a.relevanceScore ?? 0,
          relevanceExplanation: a.relevanceExplanation ?? '',
          keywords: a.keywords ?? [],
          isOpenAccess: a.isOpenAccess ?? false,
          articleType: a.articleType,
        })),
      );
    } catch (error) {
      throw toAppError(error, 'pubmed');
    }
  }

  // Search arXiv
  let arxivArticles: RankedArticle[] = [];
  if (maxArxiv > 0 && !options.signal?.aborted) {
    try {
      const arxivResults = await withCircuitBreaker('arxiv', () =>
        searchAndFetchArxiv(queries[0]?.query ?? '', maxArxiv, options.signal),
      );
      apiCalls++;
      // Convert Partial<RankedArticle> to RankedArticle with defaults
      arxivArticles = arxivResults.map((article) => ({
        pmid: article.pmid ?? '',
        pmcId: article.pmcId,
        title: article.title ?? '',
        authors: article.authors ?? '',
        journal: article.journal ?? '',
        pubYear: article.pubYear ?? '',
        summary: article.summary ?? '',
        relevanceScore: 50, // Default score, will be re-ranked
        relevanceExplanation: 'arXiv preprint (initial score)',
        keywords: article.keywords ?? [],
        isOpenAccess: article.isOpenAccess ?? true,
        articleType: article.articleType ?? 'Preprint',
      }));
    } catch (error) {
      console.warn('arXiv search failed:', error);
    }
  }

  return {
    pubmedArticles: allArticles,
    arxivArticles,
    pubmedCount: allArticles.length,
    arxivCount: arxivArticles.length,
    apiCalls,
  };
}

/**
 * Retrieve related articles via elink for a given PMID.
 */
export async function retrieveRelatedArticles(
  _pmid: string,
  _maxRelated: number = 5,
  signal?: AbortSignal,
): Promise<string[]> {
  if (signal?.aborted) {
    throw new AppError({
      code: 'STREAM_ABORTED',
      message: 'Related article retrieval aborted',
      retryable: false,
    });
  }

  // elink is handled within fetchArticleDetails in pubmedUtils
  // This is a placeholder for explicit related-article fetching
  return [];
}

/**
 * Check if an article is open access via PMCID or other indicators.
 */
export function isOpenAccess(article: RankedArticle): boolean {
  return article.isOpenAccess ?? false;
}

/**
 * Fetch open access status for articles.
 */
export async function enrichOpenAccessStatus(
  articles: RankedArticle[],
  _signal?: AbortSignal,
): Promise<RankedArticle[]> {
  return articles.map((article) => ({
    ...article,
    isOpenAccess: isOpenAccess(article),
  }));
}
