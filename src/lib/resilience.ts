/**
 * Shared retry / backoff helpers for external service calls.
 */

export interface BackoffOptions {
  retries?: number;
  /** Initial delay in ms. Default 1000. */
  baseMs?: number;
  /** Max delay cap in ms. Default 15_000. */
  maxMs?: number;
  /** Random jitter factor 0–1 applied to delay. Default 0.2. */
  jitter?: number;
  /** Return true to retry this error. Default: always retry while attempts remain. */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  signal?: AbortSignal;
  sleep?: (ms: number) => Promise<void>;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeDelay(attempt: number, baseMs: number, maxMs: number, jitter: number): number {
  const exp = Math.min(maxMs, baseMs * 2 ** attempt);
  const jitterAmount = exp * jitter * Math.random();
  return Math.min(maxMs, Math.floor(exp + jitterAmount));
}

/**
 * Execute `fn` with exponential backoff + jitter.
 * Attempt 0 is the first try; retries happen after failures.
 */
export async function withExponentialBackoff<T>(
  fn: (attempt: number) => Promise<T>,
  options: BackoffOptions = {},
): Promise<T> {
  const retries = options.retries ?? 3;
  const baseMs = options.baseMs ?? 1000;
  const maxMs = options.maxMs ?? 15_000;
  const jitter = options.jitter ?? 0.2;
  const sleep = options.sleep ?? defaultSleep;
  const shouldRetry = options.shouldRetry ?? (() => true);

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (options.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      if (error instanceof Error && error.name === 'AbortError') throw error;
      if (attempt >= retries || !shouldRetry(error, attempt)) throw error;
      await sleep(computeDelay(attempt, baseMs, maxMs, jitter));
    }
  }
  throw lastError;
}

/** Approximate Gemini Flash input+output cost (USD) for UI warnings — rough order of magnitude. */
export function estimateGeminiCostUsd(params: {
  inputTokens: number;
  outputTokens: number;
  /** flash | pro */
  tier?: 'flash' | 'pro';
}): number {
  const tier = params.tier ?? 'flash';
  // Approximate public list prices mid-2026 (USD per 1M tokens) — estimator only.
  const rates = tier === 'pro' ? { input: 1.25, output: 10.0 } : { input: 0.15, output: 0.6 };
  return (
    (params.inputTokens / 1_000_000) * rates.input +
    (params.outputTokens / 1_000_000) * rates.output
  );
}

/** Heuristic token estimate from character length (~4 chars/token). */
export function estimateTokensFromText(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}
