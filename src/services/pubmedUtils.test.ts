import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { searchPubMedForIds, fetchArticleDetails } from './pubmedUtils';
import { resetAllCircuitBreakers } from '../lib/circuitBreaker';

describe('pubmedUtils', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    resetAllCircuitBreakers();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    resetAllCircuitBreakers();
  });

  it('searchPubMedForIds parses idlist from JSON', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => ({ esearchresult: { idlist: ['123', '456'] } }),
    });

    const ids = await searchPubMedForIds('cancer', 10);
    expect(ids).toEqual(['123', '456']);
    expect(fetch).toHaveBeenCalled();
  });

  it('searchPubMedForIds returns empty list when idlist missing', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => ({ esearchresult: {} }),
    });
    await expect(searchPubMedForIds('x', 5)).resolves.toEqual([]);
  });

  it('searchPubMedForIds maps network failures to AppError', async () => {
    vi.useFakeTimers();
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('offline'));
    const promise = searchPubMedForIds('cancer', 10);
    const assertion = expect(promise).rejects.toMatchObject({
      code: 'NCBI_NETWORK',
    });
    await vi.runAllTimersAsync();
    await assertion;
    vi.useRealTimers();
  });

  it('searchPubMedForIds throws NCBI_RATE_LIMIT on final 429', async () => {
    vi.useFakeTimers();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      headers: { get: () => '0' },
      json: async () => ({}),
    });
    const promise = searchPubMedForIds('cancer', 10);
    const assertion = expect(promise).rejects.toMatchObject({ code: 'NCBI_RATE_LIMIT' });
    await vi.runAllTimersAsync();
    await assertion;
    vi.useRealTimers();
  });

  it('fetchArticleDetails returns [] for empty pmids', async () => {
    await expect(fetchArticleDetails([])).resolves.toEqual([]);
  });

  it('fetchArticleDetails maps esummary result', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: () => null },
      json: async () => ({
        result: {
          uids: ['1'],
          '1': {
            title: 'T',
            authors: [{ name: 'A' }],
            fulljournalname: 'J',
            pubdate: '2020 Jan',
            abstract: 'Abs',
            articleids: [{ idtype: 'pmc', value: 'PMC1' }],
          },
        },
      }),
    });

    const rows = await fetchArticleDetails(['1']);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      pmid: '1',
      title: 'T',
      pmcId: 'PMC1',
      isOpenAccess: true,
      pubYear: '2020',
    });
  });

  it('fetchArticleDetails skips missing uids and invalid year tokens', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: () => null },
      json: async () => ({
        result: {
          uids: ['1', '2'],
          '1': {
            title: 'Only',
            authors: [],
            fulljournalname: 'J',
            pubdate: 'in press',
            articleids: [],
          },
        },
      }),
    });
    const rows = await fetchArticleDetails(['1', '2']);
    expect(rows).toHaveLength(1);
    expect(rows[0].pubYear).toBeUndefined();
  });

  it('fetchArticleDetails throws on invalid payload', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: () => null },
      json: async () => ({}),
    });
    await expect(fetchArticleDetails(['1'])).rejects.toMatchObject({ code: 'NCBI_NETWORK' });
  });

  it('does not retry AbortError', async () => {
    const abort = new DOMException('Aborted', 'AbortError');
    globalThis.fetch = vi.fn().mockRejectedValue(abort);
    await expect(searchPubMedForIds('x', 1)).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
