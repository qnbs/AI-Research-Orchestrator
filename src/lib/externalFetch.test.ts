import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const sleepAbortableMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('./resilience', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./resilience')>();
  return {
    ...actual,
    sleepAbortable: sleepAbortableMock,
  };
});

import {
  fetchWithExternalPolicy,
  isRetryableHttpStatus,
  parseRetryAfterMs,
  RetryableHttpResponseError,
} from './externalFetch';

describe('parseRetryAfterMs', () => {
  it('parses delta seconds and HTTP dates', () => {
    expect(parseRetryAfterMs('2')).toBe(2000);
    const future = new Date(Date.now() + 5000).toUTCString();
    const parsed = parseRetryAfterMs(future);
    expect(parsed).toBeGreaterThanOrEqual(4000);
    expect(parsed).toBeLessThanOrEqual(6000);
  });
});

describe('isRetryableHttpStatus', () => {
  it('classifies 429 and 5xx as retryable', () => {
    expect(isRetryableHttpStatus(429)).toBe(true);
    expect(isRetryableHttpStatus(500)).toBe(true);
    expect(isRetryableHttpStatus(404)).toBe(false);
  });
});

describe('fetchWithExternalPolicy', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    sleepAbortableMock.mockReset();
    sleepAbortableMock.mockResolvedValue(undefined);
    vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => new AbortController().signal);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns on first successful response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 } as Response);
    const res = await fetchWithExternalPolicy('https://example.com');
    expect(res.status).toBe(200);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('retries 429 honoring Retry-After', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: { get: () => '1' },
      } as unknown as Response)
      .mockResolvedValueOnce({ ok: true, status: 200 } as Response);

    const res = await fetchWithExternalPolicy('https://example.com', {}, { retries: 2 });
    expect(res.status).toBe(200);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(sleepAbortableMock).toHaveBeenCalledWith(1000, undefined);
  });

  it('retries 5xx responses', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 } as Response)
      .mockResolvedValueOnce({ ok: true, status: 200 } as Response);

    const res = await fetchWithExternalPolicy(
      'https://example.com',
      {},
      {
        retries: 2,
        baseMs: 5,
        jitter: 0,
      },
    );
    expect(res.status).toBe(200);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-retryable 4xx', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 } as Response);
    const res = await fetchWithExternalPolicy('https://example.com', {}, { retries: 3 });
    expect(res.status).toBe(404);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('aborts during backoff without further retries', async () => {
    const ctrl = new AbortController();
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network'));
    sleepAbortableMock.mockImplementation(
      () =>
        new Promise<void>((_resolve, reject) => {
          ctrl.signal.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true },
          );
        }),
    );

    const promise = fetchWithExternalPolicy(
      'https://example.com',
      {},
      {
        retries: 3,
        baseMs: 10,
        jitter: 0,
        signal: ctrl.signal,
      },
    );

    await Promise.resolve();
    ctrl.abort();
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('rejects immediately when signal is already aborted', async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    globalThis.fetch = vi.fn();
    await expect(
      fetchWithExternalPolicy('https://example.com', {}, { signal: ctrl.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('stops when max elapsed retry budget is exceeded before fetch', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network'));
    await expect(
      fetchWithExternalPolicy(
        'https://example.com',
        {},
        {
          retries: 10,
          baseMs: 1000,
          maxElapsedMs: 0,
        },
      ),
    ).rejects.toThrow('retry budget exhausted');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('RetryableHttpResponseError carries response metadata', () => {
    const response = { status: 429 } as Response;
    const err = new RetryableHttpResponseError(response, 2000);
    expect(err.response).toBe(response);
    expect(err.retryAfterMs).toBe(2000);
  });
});
