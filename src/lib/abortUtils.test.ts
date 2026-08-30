import { describe, it, expect, vi } from 'vitest';
import { combineAbortSignals, isAbortLikeError, isTimeoutAbortReason } from './abortUtils';

describe('isAbortLikeError', () => {
  it('detects DOMException AbortError and SDK APIUserAbortError', () => {
    expect(isAbortLikeError(new DOMException('Aborted', 'AbortError'))).toBe(true);
    expect(isAbortLikeError(new Error('AbortError'))).toBe(false);
    const named = new Error('Request was aborted.');
    named.name = 'AbortError';
    expect(isAbortLikeError(named)).toBe(true);
    class APIUserAbortError extends Error {
      constructor() {
        super('Request was aborted.');
      }
    }
    expect(isAbortLikeError(new APIUserAbortError())).toBe(true);
    expect(isAbortLikeError({ status: 429 })).toBe(false);
  });
});

describe('combineAbortSignals', () => {
  it('returns timeout-only signal when external is undefined', () => {
    const { signal, dispose } = combineAbortSignals(60_000);
    expect(signal).toBeDefined();
    dispose();
  });

  it('aborts when external signal aborts', async () => {
    const outer = new AbortController();
    const { signal, dispose } = combineAbortSignals(60_000, outer.signal);
    const p = new Promise<void>((resolve) => {
      signal.addEventListener('abort', () => resolve());
    });
    outer.abort();
    await expect(p).resolves.toBeUndefined();
    dispose();
  });

  it('starts already aborted when the external signal is already aborted', () => {
    const outer = new AbortController();
    outer.abort();
    const { signal } = combineAbortSignals(60_000, outer.signal);
    expect(signal.aborted).toBe(true);
  });

  it('aborts with TimeoutError when the timeout elapses', async () => {
    vi.useFakeTimers();
    try {
      const outer = new AbortController();
      const { signal, dispose } = combineAbortSignals(50, outer.signal);
      const p = new Promise<void>((resolve) => {
        signal.addEventListener('abort', () => resolve(), { once: true });
      });
      await vi.advanceTimersByTimeAsync(50);
      await p;
      expect(signal.aborted).toBe(true);
      expect(isTimeoutAbortReason(signal.reason)).toBe(true);
      dispose();
    } finally {
      vi.useRealTimers();
    }
  });

  it('removes the external abort listener when the timeout fires before caller abort', async () => {
    vi.useFakeTimers();
    try {
      const outer = new AbortController();
      const removeSpy = vi.spyOn(outer.signal, 'removeEventListener');
      const { signal, dispose } = combineAbortSignals(50, outer.signal);
      await vi.advanceTimersByTimeAsync(50);
      expect(signal.aborted).toBe(true);
      expect(isTimeoutAbortReason(signal.reason)).toBe(true);
      expect(removeSpy).toHaveBeenCalled();
      dispose();
    } finally {
      vi.useRealTimers();
    }
  });

  it('clears the timeout-only timer when dispose runs before the deadline', async () => {
    vi.useFakeTimers();
    try {
      const { signal, dispose } = combineAbortSignals(50);
      dispose();
      expect(signal.aborted).toBe(true);
      expect(isTimeoutAbortReason(signal.reason)).toBe(false);
      await vi.advanceTimersByTimeAsync(50);
      expect(isTimeoutAbortReason(signal.reason)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('forwards the caller abort reason instead of replacing it', async () => {
    const outer = new AbortController();
    const { signal, dispose } = combineAbortSignals(60_000, outer.signal);
    const reason = new Error('caller-stop');
    const p = new Promise<void>((resolve) => {
      signal.addEventListener('abort', () => resolve(), { once: true });
    });
    outer.abort(reason);
    await p;
    expect(signal.reason).toBe(reason);
    dispose();
  });
});
