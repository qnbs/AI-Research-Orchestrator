/**
 * arXiv API utilities
 *
 * Search and fetch preprint articles from the arXiv Atom REST API.
 * https://export.arxiv.org/api/query
 */
import type { RankedArticle } from '../types';
import { fetchWithExternalPolicy } from '../lib/externalFetch';
import { isAbortError } from '../lib/errors';
import { ensureArticleIdentifiers } from '../lib/sourceIdentifier';

const ARXIV_BASE = 'https://export.arxiv.org/api/query';
const ARXIV_TIMEOUT_MS = 18_000;

/** Typed arXiv retrieval outcome (WS-07 / #401). */
export type ArxivFetchOutcome =
  | 'success_with_results'
  | 'success_empty'
  | 'http_error'
  | 'network_error'
  | 'parse_error'
  | 'cancelled';

export interface ArxivFetchResult {
  articles: Partial<RankedArticle>[];
  outcome: ArxivFetchOutcome;
  /** Present when outcome is `http_error`. */
  httpStatus?: number;
}

/** True when arXiv was requested but could not be retrieved (not a zero-hit search). */
export function isArxivRetrievalFailure(outcome: ArxivFetchOutcome): boolean {
  return outcome !== 'success_with_results' && outcome !== 'success_empty';
}

/** Convert a single Atom <entry> element to a RankedArticle-compatible record. */
function entryToRankedArticle(entry: Element): Partial<RankedArticle> {
  const getText = (tag: string): string =>
    entry.getElementsByTagName(tag)[0]?.textContent?.trim() ?? '';

  // Extract arXiv ID from the <id> URI, e.g. http://arxiv.org/abs/2301.12345v2
  const idRaw = getText('id');
  const arxivId = idRaw.replace(/.*\/abs\//, '').replace(/v\d+$/, '');

  const authors = Array.from(entry.getElementsByTagName('author'))
    .map((a) => a.getElementsByTagName('name')[0]?.textContent?.trim() ?? '')
    .filter(Boolean)
    .join(', ');

  const categories = Array.from(entry.getElementsByTagName('category'))
    .map((c) => c.getAttribute('term') ?? '')
    .filter(Boolean);

  // arXiv uses a namespace for journal_ref and doi — try both with and without NS
  const journalRef =
    entry
      .getElementsByTagNameNS('http://arxiv.org/schemas/atom', 'journal_ref')[0]
      ?.textContent?.trim() ?? entry.getElementsByTagName('journal_ref')[0]?.textContent?.trim();

  const pubDate = getText('published').split('T')[0]; // YYYY-MM-DD
  const pubYear = pubDate.split('-')[0];

  return {
    pmid: `arxiv:${arxivId}`, // synthetic PMID keeps the pipeline unified
    articleId: { type: 'arxiv', value: arxivId },
    title: getText('title').replace(/\s+/g, ' '),
    authors,
    journal: journalRef ?? (categories[0] ? `arXiv [${categories[0]}]` : 'arXiv Preprint'),
    pubYear,
    summary: getText('summary').replace(/\s+/g, ' '),
    isOpenAccess: true, // arXiv is always open access
    keywords: categories,
    relevanceScore: 0,
    relevanceExplanation: '',
    articleType: 'Preprint',
  } satisfies Partial<RankedArticle>;
}

/**
 * Search arXiv with an explicit outcome (empty results vs unavailable source).
 */
export async function searchAndFetchArxivDetailed(
  topic: string,
  maxResults: number,
  signal?: AbortSignal,
): Promise<ArxivFetchResult> {
  const empty = (outcome: ArxivFetchOutcome, httpStatus?: number): ArxivFetchResult => ({
    articles: [],
    outcome,
    httpStatus,
  });

  try {
    const query = encodeURIComponent(topic);
    const url =
      `${ARXIV_BASE}?search_query=all:${query}` +
      `&start=0&max_results=${maxResults}` +
      `&sortBy=relevance&sortOrder=descending`;

    const res = await fetchWithExternalPolicy(
      url,
      {},
      {
        retries: 3,
        baseMs: 1200,
        timeoutMs: ARXIV_TIMEOUT_MS,
        signal,
      },
    );
    if (!res.ok) return empty('http_error', res.status);

    const xml = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');

    if (doc.querySelector('parsererror')) return empty('parse_error');

    const root = doc.documentElement;
    const isAtomFeed =
      root?.localName === 'feed' &&
      (root.namespaceURI === 'http://www.w3.org/2005/Atom' || root.namespaceURI === null);
    if (!isAtomFeed) return empty('parse_error');

    const articles = Array.from(doc.getElementsByTagName('entry')).map((entry) =>
      ensureArticleIdentifiers(entryToRankedArticle(entry) as RankedArticle),
    );
    return {
      articles,
      outcome: articles.length > 0 ? 'success_with_results' : 'success_empty',
    };
  } catch (error) {
    if (isAbortError(error) || signal?.aborted) {
      throw error;
    }
    return empty('network_error');
  }
}

/**
 * Search arXiv for articles matching `topic` and return them as
 * RankedArticle-compatible records (with pmid = "arxiv:<id>").
 *
 * Backward-compatible wrapper — prefer `searchAndFetchArxivDetailed` when
 * distinguishing empty results from source unavailability.
 */
export async function searchAndFetchArxiv(
  topic: string,
  maxResults: number,
  signal?: AbortSignal,
): Promise<Partial<RankedArticle>[]> {
  const result = await searchAndFetchArxivDetailed(topic, maxResults, signal);
  return result.articles;
}
