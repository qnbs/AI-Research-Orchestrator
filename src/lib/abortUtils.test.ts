import { describe, it, expect } from 'vitest';
import { combineAbortSignals } from './abortUtils';

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
});
