import { describe, it, expect, vi } from 'vitest';
import { combineAbortSignals, isTimeoutAbortReason } from './abortUtils';

describe('combineAbortSignals', () => {
  it('returns timeout-only signal when external is undefined', () => {
    const s = combineAbortSignals(60_000);
    expect(s).toBeDefined();
  });

  it('aborts when external signal aborts', async () => {
    const outer = new AbortController();
    const signal = combineAbortSignals(60_000, outer.signal);
    const p = new Promise<void>((resolve) => {
      signal.addEventListener('abort', () => resolve());
    });
    outer.abort();
    await expect(p).resolves.toBeUndefined();
  });

  it('starts already aborted when the external signal is already aborted', () => {
    const outer = new AbortController();
    outer.abort();
    const signal = combineAbortSignals(60_000, outer.signal);
    expect(signal.aborted).toBe(true);
  });

  it('aborts with TimeoutError when the timeout elapses', async () => {
    vi.useFakeTimers();
    try {
      const outer = new AbortController();
      const signal = combineAbortSignals(50, outer.signal);
      const p = new Promise<void>((resolve) => {
        signal.addEventListener('abort', () => resolve(), { once: true });
      });
      await vi.advanceTimersByTimeAsync(50);
      await p;
      expect(signal.aborted).toBe(true);
      expect(isTimeoutAbortReason(signal.reason)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
