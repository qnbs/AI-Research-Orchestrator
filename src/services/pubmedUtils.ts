/**
 * PubMed plain-fetch utilities
 *
 * Used ONLY by service-layer code (geminiService, journalService, etc.) that
 * runs inside async generators or plain async functions where React hooks
 * cannot be used. React components should use the RTK Query endpoints in
 * `src/store/slices/apiSlice.ts` instead, which add caching and deduplication.
 */
import type { RankedArticle } from '../types';
import { combineAbortSignals } from '../lib/abortUtils';
import { withCircuitBreaker, CircuitOpenError } from '../lib/circuitBreaker';
import { AppError, isAbortError } from '../lib/errors';

const PUBMED_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const PUBMED_CIRCUIT = 'pubmed';

/** Append NCBI api_key when provided (higher rate limits). */
export function withNcbiApiKey(url: string, apiKey?: string): string {
  const key = apiKey?.trim();
  if (!key) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}api_key=${encodeURIComponent(key)}`;
}

async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  retries = 3,
  backoff = 1000,
): Promise<Response> {
  try {
    const response = await fetch(url, {
      ...init,
      signal: combineAbortSignals(15000, init.signal),
    });
    if (response.status === 429 && retries > 0) {
      const wait = parseInt(response.headers.get('Retry-After') ?? '0', 10) * 1000 || backoff * 2;
      await new Promise((r) => setTimeout(r, wait));
      return fetchWithRetry(url, init, retries - 1, wait);
    }
    if (!response.ok && retries > 0 && response.status >= 500) {
      await new Promise((r) => setTimeout(r, backoff));
      return fetchWithRetry(url, init, retries - 1, backoff * 2);
    }
    return response;
  } catch (err) {
    if (isAbortError(err)) throw err;
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, backoff));
      return fetchWithRetry(url, init, retries - 1, backoff * 2);
    }
    throw err;
  }
}

async function pubmedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await withCircuitBreaker(PUBMED_CIRCUIT, () => fetchWithRetry(url, init), {
      failureThreshold: 5,
      cooldownMs: 30_000,
    });
  } catch (err) {
    if (err instanceof CircuitOpenError) {
      throw new AppError({
        code: 'CIRCUIT_OPEN',
        message: err.message,
        retryable: true,
        context: 'pubmed',
        cause: err,
      });
    }
    throw err;
  }
}

/** Search PubMed and return an array of PMIDs. */
export async function searchPubMedForIds(
  query: string,
  retmax: number,
  signal?: AbortSignal,
  apiKey?: string,
): Promise<string[]> {
  const url = withNcbiApiKey(
    `${PUBMED_BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${retmax}&sort=relevance&retmode=json`,
    apiKey,
  );
  try {
    const response = await pubmedFetch(url, { signal });
    if (response.status === 429) {
      throw new AppError({
        code: 'NCBI_RATE_LIMIT',
        message: 'PubMed rate limit (429)',
        retryable: true,
        context: 'pubmed',
        status: 429,
      });
    }
    if (!response.ok) throw new Error(`PubMed API error: ${response.statusText}`);
    const data = await response.json();
    return data.esearchresult?.idlist ?? [];
  } catch (error) {
    if (isAbortError(error) || error instanceof AppError) throw error;
    if (error instanceof Error) {
      throw new AppError({
        code: 'NCBI_NETWORK',
        message: `Failed to fetch from PubMed: ${error.message}`,
        retryable: true,
        context: 'pubmed',
        cause: error,
      });
    }
    throw new AppError({
      code: 'NCBI_NETWORK',
      message: 'An unknown network error occurred while searching PubMed.',
      retryable: true,
      context: 'pubmed',
      cause: error,
    });
  }
}

/** Fetch full article details for the given PMIDs via POST to esummary. */
export async function fetchArticleDetails(
  pmids: string[],
  signal?: AbortSignal,
  apiKey?: string,
): Promise<Partial<RankedArticle>[]> {
  if (!pmids.length) return [];
  const url = withNcbiApiKey(`${PUBMED_BASE}/esummary.fcgi?db=pubmed&retmode=json`, apiKey);
  const formData = new FormData();
  formData.append('id', pmids.join(','));
  const response = await pubmedFetch(url, { method: 'POST', body: formData, signal });
  if (response.status === 429) {
    throw new AppError({
      code: 'NCBI_RATE_LIMIT',
      message: 'PubMed rate limit (429)',
      retryable: true,
      context: 'pubmed',
      status: 429,
    });
  }
  if (!response.ok) {
    throw new AppError({
      code: 'NCBI_NETWORK',
      message: `PubMed API error: ${response.statusText}`,
      retryable: response.status >= 500,
      context: 'pubmed',
      status: response.status,
    });
  }
  const data = await response.json();
  if (!data.result) {
    throw new AppError({
      code: 'NCBI_NETWORK',
      message: 'Invalid response format from PubMed.',
      retryable: false,
      context: 'pubmed',
    });
  }
  const articles: Partial<RankedArticle>[] = [];
  for (const pmid of data.result.uids as string[]) {
    const art = data.result[pmid];
    if (!art) continue;
    const pmcEntry = ((art.articleids ?? []) as Array<{ idtype: string; value: string }>).find(
      (x) => x.idtype === 'pmc',
    );
    const yearRaw = (art.pubdate ?? '').split(' ')[0];
    const pubYear = /^\d{4}$/.test(yearRaw) ? yearRaw : undefined;
    articles.push({
      pmid,
      pmcId: pmcEntry?.value,
      title: art.title ?? '',
      authors: ((art.authors ?? []) as Array<{ name: string }>).map((a) => a.name).join(', '),
      journal: art.fulljournalname ?? '',
      pubYear,
      summary: art.abstract || 'No abstract available.',
      isOpenAccess: !!pmcEntry?.value,
      keywords: [],
      relevanceScore: 0,
      relevanceExplanation: '',
    });
  }
  return articles;
}
