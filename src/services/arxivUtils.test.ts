import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const sleepAbortableMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('../lib/resilience', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/resilience')>();
  return {
    ...actual,
    sleepAbortable: sleepAbortableMock,
  };
});

import { searchAndFetchArxiv, searchAndFetchArxivDetailed } from './arxivUtils';

const atom = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/2301.99999v1</id>
    <title> Test Title </title>
    <summary> Abstract here. </summary>
    <published>2023-01-15T12:00:00Z</published>
    <author><name>Jane Doe</name></author>
    <category term="cs.AI"/>
  </entry>
</feed>`;

describe('arxivUtils', () => {
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

  it('searchAndFetchArxiv maps Atom entries', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => atom,
    });

    const rows = await searchAndFetchArxiv('quantum', 5);
    expect(rows).toHaveLength(1);
    expect(rows[0].pmid).toBe('arxiv:2301.99999');
    expect(rows[0].title).toContain('Test Title');
  });

  it('returns parse_error when the response is not an Atom feed', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '<?xml version="1.0"?><error><message>rate limit</message></error>',
    });
    await expect(searchAndFetchArxivDetailed('x', 1)).resolves.toMatchObject({
      articles: [],
      outcome: 'parse_error',
    });
  });

  it('returns http_error outcome on non-OK HTTP without long retry', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    await expect(searchAndFetchArxivDetailed('x', 1)).resolves.toMatchObject({
      articles: [],
      outcome: 'http_error',
      httpStatus: 404,
    });
  });

  it('searchAndFetchArxiv wrapper returns articles only', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    await expect(searchAndFetchArxiv('x', 1)).resolves.toEqual([]);
  });

  it('propagates abort when signal is already aborted after a generic fetch error', async () => {
    const ac = new AbortController();
    ac.abort();
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network'));
    await expect(searchAndFetchArxivDetailed('topic', 1, ac.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it('aborts during backoff without swallowing AbortError', async () => {
    const ac = new AbortController();
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network'));
    sleepAbortableMock.mockImplementation(() => new Promise<void>(() => {}));

    const promise = searchAndFetchArxiv('topic', 1, ac.signal);
    await Promise.resolve();
    ac.abort();
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});
