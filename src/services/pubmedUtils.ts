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
import { withExponentialBackoff } from '../lib/resilience';

const PUBMED_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const PUBMED_CIRCUIT = 'pubmed';
const PUBMED_RETRIES = 3;
const PUBMED_TIMEOUT_MS = 15_000;

/** Append NCBI api_key when provided (higher rate limits). */
export function withNcbiApiKey(url: string, apiKey?: string): string {
  const key = apiKey?.trim();
  if (!key) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}api_key=${encodeURIComponent(key)}`;
}

class RetryablePubMedResponseError extends Error {
  constructor(
    readonly response: Response,
    readonly retryAfterMs?: number,
  ) {
    super(`Retryable PubMed response: ${response.status}`);
    this.name = 'RetryablePubMedResponseError';
  }
}

function isRetryablePubMedStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function parseRetryAfterMs(header: string | null): number | undefined {
  if (!header) return undefined;

  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  const dateMs = Date.parse(header);
  if (Number.isFinite(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }

  return undefined;
}

function pubMedHttpError(response: Response): AppError {
  if (response.status === 429) {
    return new AppError({
      code: 'NCBI_RATE_LIMIT',
      message: 'PubMed rate limit (429)',
      retryable: true,
      context: 'pubmed',
      status: 429,
    });
  }

  return new AppError({
    code: 'NCBI_NETWORK',
    message: `PubMed API error: ${response.statusText || response.status}`,
    retryable: response.status >= 500,
    context: 'pubmed',
    status: response.status,
  });
}

async function fetchWithRetry(url: string, init: RequestInit = {}): Promise<Response> {
  let retryAfterMs: number | undefined;

  return withExponentialBackoff(
    async (attempt) => {
      const response = await fetch(url, {
        ...init,
        signal: combineAbortSignals(PUBMED_TIMEOUT_MS, init.signal),
      });

      if (isRetryablePubMedStatus(response.status) && attempt < PUBMED_RETRIES) {
        throw new RetryablePubMedResponseError(
          response,
          response.status === 429
            ? parseRetryAfterMs(response.headers.get('Retry-After'))
            : undefined,
        );
      }

      return response;
    },
    {
      retries: PUBMED_RETRIES,
      baseMs: 1000,
      maxMs: 15_000,
      jitter: 0,
      signal: init.signal ?? undefined,
      shouldRetry: (error) => {
        if (isAbortError(error)) return false;
        if (error instanceof RetryablePubMedResponseError) {
          retryAfterMs = error.retryAfterMs;
          return true;
        }
        return true;
      },
      sleep: (ms) => {
        const delay = retryAfterMs ?? ms;
        retryAfterMs = undefined;
        const signal = init.signal ?? undefined;
        return new Promise((resolve, reject) => {
          if (signal?.aborted) {
            reject(new DOMException('Aborted', 'AbortError'));
            return;
          }
          const timer = setTimeout(resolve, delay);
          const onAbort = () => {
            clearTimeout(timer);
            reject(new DOMException('Aborted', 'AbortError'));
          };
          signal?.addEventListener('abort', onAbort, { once: true });
        });
      },
    },
  );
}

async function pubmedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await withCircuitBreaker(
      PUBMED_CIRCUIT,
      async () => {
        const response = await fetchWithRetry(url, init);
        if (isRetryablePubMedStatus(response.status)) {
          throw pubMedHttpError(response);
        }
        return response;
      },
      {
        failureThreshold: 5,
        cooldownMs: 30_000,
      },
    );
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
    if (!response.ok) throw pubMedHttpError(response);
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
  if (!response.ok) {
    throw pubMedHttpError(response);
  }
  const data = await response.json();
  if (!data.result || !Array.isArray(data.result.uids)) {
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
    const pubYear = /^\d{4}$/.test(yearRaw) ? yearRaw : '0000';
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
