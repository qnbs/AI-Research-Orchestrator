import { describe, it, expect, vi } from 'vitest';
import {
  estimateGeminiCostUsd,
  estimateTokensFromText,
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
    expect(cost).toBeCloseTo(0.75, 5);
    const pro = estimateGeminiCostUsd({
      inputTokens: 1_000_000,
      outputTokens: 0,
      tier: 'pro',
    });
    expect(pro).toBeCloseTo(1.25, 5);
  });
});
