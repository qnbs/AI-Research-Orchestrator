import { describe, it, expect, vi } from 'vitest';
import {
  estimateGeminiCostUsd,
  estimateResearchRunCostUsd,
  estimateTokensFromText,
  shouldWarnAboutResearchCost,
  withExponentialBackoff,
} from './resilience';

describe('withExponentialBackoff', () => {
  it('returns on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    await expect(withExponentialBackoff(fn, { retries: 2, sleep: async () => {} })).resolves.toBe(
      'ok',
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries then succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('temp'))
      .mockRejectedValueOnce(new Error('temp'))
      .mockResolvedValue('done');
    const sleep = vi.fn().mockResolvedValue(undefined);
    await expect(withExponentialBackoff(fn, { retries: 3, baseMs: 10, sleep })).resolves.toBe(
      'done',
    );
    expect(fn).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('does not retry AbortError', async () => {
    const fn = vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError'));
    await expect(
      withExponentialBackoff(fn, { retries: 3, sleep: async () => {} }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('respects shouldRetry=false', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('nope'));
    await expect(
      withExponentialBackoff(fn, {
        retries: 5,
        shouldRetry: () => false,
        sleep: async () => {},
      }),
    ).rejects.toThrow('nope');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('aborts before attempt when signal aborted', async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    await expect(
      withExponentialBackoff(async () => 1, { signal: ctrl.signal, sleep: async () => {} }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('aborts immediately during a pending backoff delay', async () => {
    const ctrl = new AbortController();
    const fn = vi.fn().mockRejectedValue(new Error('temporary'));
    const sleep = vi.fn(() => new Promise<void>(() => {}));

    const promise = withExponentialBackoff(fn, {
      retries: 3,
      baseMs: 10,
      jitter: 0,
      signal: ctrl.signal,
      sleep,
    });

    await Promise.resolve();
    expect(sleep).toHaveBeenCalledWith(10);
    ctrl.abort();

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('throws the last error once retries are exhausted', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('first'))
      .mockRejectedValueOnce(new Error('second'))
      .mockRejectedValueOnce(new Error('third'));
    await expect(
      withExponentialBackoff(fn, { retries: 2, baseMs: 5, sleep: async () => {} }),
    ).rejects.toThrow('third');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('passes the current attempt number to fn and shouldRetry', async () => {
    const attempts: number[] = [];
    const shouldRetryAttempts: number[] = [];
    const fn = vi.fn(async (attempt: number) => {
      attempts.push(attempt);
      if (attempt < 2) throw new Error('retry-me');
      return 'success';
    });
    await expect(
      withExponentialBackoff(fn, {
        retries: 3,
        sleep: async () => {},
        shouldRetry: (_err, attempt) => {
          shouldRetryAttempts.push(attempt);
          return true;
        },
      }),
    ).resolves.toBe('success');
    expect(attempts).toEqual([0, 1, 2]);
    expect(shouldRetryAttempts).toEqual([0, 1]);
  });
});

describe('cost estimators', () => {
  it('estimates tokens and cost', () => {
    expect(estimateTokensFromText('abcd')).toBe(1);
    expect(estimateTokensFromText('')).toBe(0);
    const cost = estimateGeminiCostUsd({
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      tier: 'flash',
    });
    expect(cost).toBeCloseTo(2.8, 5);
    const pro = estimateGeminiCostUsd({
      inputTokens: 1_000_000,
      outputTokens: 0,
      tier: 'pro',
    });
    expect(pro).toBeCloseTo(1.25, 5);
  });

  it('defaults to the flash tier when tier is omitted', () => {
    const flashDefault = estimateGeminiCostUsd({ inputTokens: 1_000_000, outputTokens: 0 });
    const flashExplicit = estimateGeminiCostUsd({
      inputTokens: 1_000_000,
      outputTokens: 0,
      tier: 'flash',
    });
    expect(flashDefault).toBeCloseTo(flashExplicit, 10);
    expect(flashDefault).toBeCloseTo(0.3, 5);
  });

  it('returns 0 cost for zero tokens', () => {
    expect(estimateGeminiCostUsd({ inputTokens: 0, outputTokens: 0 })).toBe(0);
  });

  it('rounds token estimate up to the nearest whole token', () => {
    expect(estimateTokensFromText('a')).toBe(1);
    expect(estimateTokensFromText('abcde')).toBe(2);
    expect(estimateTokensFromText('abcdefgh')).toBe(2);
  });

  it('estimates research run cost and warning threshold', () => {
    const est = estimateResearchRunCostUsd({
      topic: 'cancer',
      maxArticlesToScan: 50,
      topNToSynthesize: 5,
      model: 'gemini-2.5-flash',
    });
    expect(est.tier).toBe('flash');
    expect(est.estimatedInputTokens).toBeGreaterThan(1000);
    expect(est.estimatedUsd).toBeGreaterThan(0);
    expect(shouldWarnAboutResearchCost(0.01, 0.05)).toBe(false);
    expect(shouldWarnAboutResearchCost(0.1, 0.05)).toBe(true);
  });
});
