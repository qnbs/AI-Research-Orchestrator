/**
 * Shared retry / backoff helpers for external service calls.
 */

import { isAbortError } from './errors';

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

function createAbortError(): DOMException {
  return new DOMException('Aborted', 'AbortError');
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw createAbortError();
  }
}

function sleepWithAbort(
  ms: number,
  sleep: (ms: number) => Promise<void>,
  signal?: AbortSignal,
): Promise<void> {
  throwIfAborted(signal);
  if (!signal) return sleep(ms);

  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => signal.removeEventListener('abort', onAbort);
    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn();
    };
    const onAbort = () => settle(() => reject(createAbortError()));

    signal.addEventListener('abort', onAbort, { once: true });
    sleep(ms).then(
      () => settle(() => resolve()),
      (error) => settle(() => reject(error)),
    );
  });
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
    throwIfAborted(options.signal);
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (isAbortError(error)) throw error;
      if (attempt >= retries || !shouldRetry(error, attempt)) throw error;
      await sleepWithAbort(computeDelay(attempt, baseMs, maxMs, jitter), sleep, options.signal);
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
  const rates = tier === 'pro' ? { input: 1.25, output: 10.0 } : { input: 0.3, output: 2.5 };
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

/**
 * Rough cost estimate for a full research run (query + rank + synthesis).
 * Used for pre-flight warnings — not a billing guarantee.
 */
export function estimateResearchRunCostUsd(params: {
  topic: string;
  maxArticlesToScan: number;
  topNToSynthesize: number;
  model?: string;
}): {
  estimatedUsd: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  tier: 'flash' | 'pro';
} {
  const tier: 'flash' | 'pro' = /pro/i.test(params.model ?? '') ? 'pro' : 'flash';
  const topicTokens = estimateTokensFromText(params.topic);
  const estimatedInputTokens =
    topicTokens + 800 + params.maxArticlesToScan * 400 + params.topNToSynthesize * 200;
  const estimatedOutputTokens = 600 + params.topNToSynthesize * 150 + 1200;
  return {
    tier,
    estimatedInputTokens,
    estimatedOutputTokens,
    estimatedUsd: estimateGeminiCostUsd({
      inputTokens: estimatedInputTokens,
      outputTokens: estimatedOutputTokens,
      tier,
    }),
  };
}

/** Warn when estimated cost exceeds a soft threshold (USD). */
export function shouldWarnAboutResearchCost(estimatedUsd: number, thresholdUsd = 0.05): boolean {
  return estimatedUsd >= thresholdUsd;
}
