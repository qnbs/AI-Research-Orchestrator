import { describe, it, expect, vi, afterEach } from 'vitest';
import { searchPubMedForIds, fetchArticleDetails } from './pubmedUtils';

describe('pubmedUtils', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
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

  it('fetchArticleDetails maps esummary result', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
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
    });
  });
});
