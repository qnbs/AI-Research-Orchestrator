/**
 * Shared HTTP fetch retry policy for NCBI, arXiv, RTK Query, and other external calls (P1-4).
 */

import { combineAbortSignals, isAbortLikeError } from './abortUtils';
import { sleepAbortable, withExponentialBackoff } from './resilience';

export class RetryableHttpResponseError extends Error {
  constructor(
    readonly response: Response,
    readonly retryAfterMs?: number,
  ) {
    super(`Retryable HTTP response: ${response.status}`);
    this.name = 'RetryableHttpResponseError';
  }
}

/** Parse Retry-After as delta-seconds or HTTP-date. */
export function parseRetryAfterMs(header: string | null): number | undefined {
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

export function isRetryableHttpStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

export type ExternalFetchPolicyOptions = {
  retries?: number;
  baseMs?: number;
  maxMs?: number;
  jitter?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Wall-clock cap for the whole fetch+retry sequence. Default 60s. */
  maxElapsedMs?: number;
};

const DEFAULT_RETRIES = 3;
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_ELAPSED_MS = 60_000;

/**
 * Fetch with exponential backoff, jitter, Retry-After, abort-aware sleeps, and elapsed budget.
 */
export async function fetchWithExternalPolicy(
  url: string,
  init: RequestInit = {},
  options: ExternalFetchPolicyOptions = {},
): Promise<Response> {
  const retries = options.retries ?? DEFAULT_RETRIES;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxElapsedMs = options.maxElapsedMs ?? DEFAULT_MAX_ELAPSED_MS;
  const signal = options.signal ?? init.signal ?? undefined;
  const startedAt = Date.now();
  let pendingRetryAfterMs: number | undefined;

  const throwIfBudgetExceeded = (): void => {
    if (Date.now() - startedAt >= maxElapsedMs) {
      throw new Error('External fetch retry budget exhausted');
    }
  };

  return withExponentialBackoff(
    async (attempt) => {
      throwIfBudgetExceeded();
      const { signal: combined, dispose } = combineAbortSignals(timeoutMs, signal);
      try {
        const response = await fetch(url, {
          ...init,
          signal: combined,
        });

        if (isRetryableHttpStatus(response.status) && attempt < retries) {
          throw new RetryableHttpResponseError(
            response,
            response.status === 429
              ? parseRetryAfterMs(response.headers.get('Retry-After'))
              : undefined,
          );
        }

        return response;
      } finally {
        dispose();
      }
    },
    {
      retries,
      baseMs: options.baseMs ?? 1000,
      maxMs: options.maxMs ?? 15_000,
      jitter: options.jitter ?? 0.2,
      signal,
      shouldRetry: (error) => {
        if (isAbortLikeError(error)) return false;
        if (error instanceof RetryableHttpResponseError) {
          pendingRetryAfterMs = error.retryAfterMs;
          return true;
        }
        return true;
      },
      sleep: async (computedMs) => {
        throwIfBudgetExceeded();
        const delay = pendingRetryAfterMs ?? computedMs;
        pendingRetryAfterMs = undefined;
        await sleepAbortable(delay, signal);
      },
    },
  );
}
