import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { searchPubMedForIds, fetchArticleDetails } from './pubmedUtils';
import { resetAllCircuitBreakers } from '../lib/circuitBreaker';

const mockResponse = (overrides: {
  ok?: boolean;
  status?: number;
  statusText?: string;
  retryAfter?: string | null;
  json?: () => Promise<unknown>;
}): Response =>
  ({
    ok: overrides.ok ?? true,
    status: overrides.status ?? 200,
    statusText: overrides.statusText ?? 'OK',
    headers: { get: () => overrides.retryAfter ?? null },
    json: overrides.json ?? (async () => ({})),
  }) as unknown as Response;

const EFETCH_WITH_ABSTRACT_XML =
  '<?xml version="1.0"?><PubmedArticleSet><PubmedArticle><MedlineCitation><PMID>1</PMID><Article><Abstract><AbstractText>Abs</AbstractText></Abstract></Article></MedlineCitation></PubmedArticle></PubmedArticleSet>';

const EFETCH_BODY_XML =
  '<?xml version="1.0"?><PubmedArticleSet><PubmedArticle><MedlineCitation><PMID>1</PMID><Article><Abstract><AbstractText>Body</AbstractText></Abstract></Article></MedlineCitation></PubmedArticle></PubmedArticleSet>';

const EFETCH_NO_ABSTRACT_XML =
  '<?xml version="1.0"?><PubmedArticleSet><PubmedArticle><MedlineCitation><PMID>9</PMID><Article><ArticleTitle>No abs</ArticleTitle></Article></MedlineCitation></PubmedArticle></PubmedArticleSet>';

describe('pubmedUtils', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    resetAllCircuitBreakers();
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.fetch = originalFetch;
    resetAllCircuitBreakers();
  });

  it('searchPubMedForIds parses idlist from JSON', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({
        json: async () => ({ esearchresult: { idlist: ['123', '456'] } }),
      }),
    );

    const ids = await searchPubMedForIds('cancer', 10);
    expect(ids).toEqual(['123', '456']);
    expect(fetch).toHaveBeenCalled();
  });

  it('searchPubMedForIds returns empty list when idlist missing', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({
        json: async () => ({ esearchresult: {} }),
      }),
    );
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
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        retryAfter: '0',
      }),
    );
    const promise = searchPubMedForIds('cancer', 10);
    const assertion = expect(promise).rejects.toMatchObject({ code: 'NCBI_RATE_LIMIT' });
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetch).toHaveBeenCalledTimes(4);
    vi.useRealTimers();
  });

  it('honors Retry-After while retrying 429 responses', async () => {
    vi.useFakeTimers();
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        mockResponse({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          retryAfter: '2',
        }),
      )
      .mockResolvedValueOnce(
        mockResponse({
          json: async () => ({ esearchresult: { idlist: ['123'] } }),
        }),
      );

    const promise = searchPubMedForIds('cancer', 10);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1999);
    expect(fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(promise).resolves.toEqual(['123']);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('aborts during backoff without retrying again', async () => {
    vi.useFakeTimers();
    const ac = new AbortController();
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      }),
    );

    const promise = searchPubMedForIds('cancer', 10, ac.signal);
    await vi.advanceTimersByTimeAsync(0);
    ac.abort();

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('records final 5xx responses as circuit breaker failures', async () => {
    vi.useFakeTimers();
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      }),
    );

    for (let i = 0; i < 5; i += 1) {
      const promise = searchPubMedForIds('cancer', 10);
      const assertion = expect(promise).rejects.toMatchObject({
        code: 'NCBI_NETWORK',
        retryable: true,
        status: 503,
      });
      await vi.runAllTimersAsync();
      await assertion;
    }

    await expect(searchPubMedForIds('cancer', 10)).rejects.toMatchObject({
      code: 'CIRCUIT_OPEN',
    });
    expect(fetch).toHaveBeenCalledTimes(20);
  });

  it('does not retry HTTP 400 responses', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      }),
    );

    await expect(searchPubMedForIds('bad query', 10)).rejects.toMatchObject({
      code: 'NCBI_NETWORK',
      retryable: false,
      status: 400,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('fetchArticleDetails returns [] for empty pmids', async () => {
    await expect(fetchArticleDetails([])).resolves.toEqual([]);
  });

  it('fetchArticleDetails maps esummary metadata and efetch abstract', async () => {
    const esummaryJson = {
      result: {
        uids: ['1'],
        '1': {
          title: 'T',
          authors: [{ name: 'A' }],
          fulljournalname: 'J',
          pubdate: '2020 Jan',
          articleids: [{ idtype: 'pmc', value: 'PMC1' }],
        },
      },
    };
    const efetchXml = EFETCH_WITH_ABSTRACT_XML;

    globalThis.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return Promise.resolve(mockResponse({ json: () => Promise.resolve(esummaryJson) }));
      }
      if (String(url).includes('efetch.fcgi')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: { get: () => null },
          text: () => Promise.resolve(efetchXml),
        } as unknown as Response);
      }
      return Promise.resolve(mockResponse({ json: () => Promise.resolve({}) }));
    });

    const rows = await fetchArticleDetails(['1']);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      pmid: '1',
      title: 'T',
      pmcId: 'PMC1',
      isOpenAccess: true,
      pubYear: '2020',
      summary: 'Abs',
      abstractStatus: 'available',
      retrievalSource: 'pubmed_efetch',
    });
    expect(rows[0].retrievedAt).toBeTypeOf('number');
  });

  it('fetchArticleDetails skips missing uids and normalizes invalid years', async () => {
    const esummaryJson = {
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
    };
    const efetchXml = EFETCH_BODY_XML;

    globalThis.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return Promise.resolve(mockResponse({ json: () => Promise.resolve(esummaryJson) }));
      }
      if (String(url).includes('efetch.fcgi')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: { get: () => null },
          text: () => Promise.resolve(efetchXml),
        } as unknown as Response);
      }
      return Promise.resolve(mockResponse({ json: () => Promise.resolve({}) }));
    });

    const rows = await fetchArticleDetails(['1', '2']);
    expect(rows).toHaveLength(1);
    expect(rows[0].pubYear).toBe('0000');
    expect(rows[0].summary).toBe('Body');
  });

  it('fetchArticleDetails marks missing abstract without placeholder text', async () => {
    const esummaryJson = {
      result: {
        uids: ['9'],
        '9': {
          title: 'No abs',
          authors: [],
          fulljournalname: 'J',
          pubdate: '2021',
          articleids: [],
        },
      },
    };
    const efetchXml = EFETCH_NO_ABSTRACT_XML;

    globalThis.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return Promise.resolve(mockResponse({ json: () => Promise.resolve(esummaryJson) }));
      }
      if (String(url).includes('efetch.fcgi')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: { get: () => null },
          text: () => Promise.resolve(efetchXml),
        } as unknown as Response);
      }
      return Promise.resolve(mockResponse({ json: () => Promise.resolve({}) }));
    });

    const rows = await fetchArticleDetails(['9']);
    expect(rows[0]?.summary).toBe('');
    expect(rows[0]?.abstractStatus).toBe('missing');
    expect(rows[0]?.summary).not.toMatch(/No abstract available/i);
  });

  it('fetchArticleDetails throws on invalid payload', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse({ json: async () => ({}) }));
    await expect(fetchArticleDetails(['1'])).rejects.toMatchObject({ code: 'NCBI_NETWORK' });
  });

  it('fetchArticleDetails throws on invalid uids payload', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({
        json: async () => ({ result: { uids: '1' } }),
      }),
    );
    await expect(fetchArticleDetails(['1'])).rejects.toMatchObject({ code: 'NCBI_NETWORK' });
  });

  it('appends NCBI api_key when provided', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({
        json: async () => ({ esearchresult: { idlist: ['1'] } }),
      }),
    );
    await searchPubMedForIds('q', 5, undefined, 'ncbi-test-key');
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('api_key=ncbi-test-key');
  });

  it('withNcbiApiKey leaves url unchanged without key', async () => {
    const { withNcbiApiKey } = await import('./pubmedUtils');
    expect(withNcbiApiKey('https://example.com/x')).toBe('https://example.com/x');
  });
});
