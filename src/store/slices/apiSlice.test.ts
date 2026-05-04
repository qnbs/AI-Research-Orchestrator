import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { researchApi } from './apiSlice';

function makeStore() {
  return configureStore({
    reducer: { [researchApi.reducerPath]: researchApi.reducer },
    middleware: (gdm) => gdm({ serializableCheck: false }).concat(researchApi.middleware),
  });
}

describe('researchApi (apiSlice)', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn().mockImplementation((input: RequestInfo) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.includes('efetch')) {
        return Promise.resolve({
          ok: true,
          text: async () => 'Abstract text here.',
        } as Response);
      }
      if (url.includes('arxiv.org')) {
        const atom = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
          <opensearch:totalResults xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">1</opensearch:totalResults>
          <entry><id>http://arxiv.org/abs/2301.99999v1</id><title>T</title><summary>S</summary>
          <published>2023-01-01T00:00:00Z</published><author><name>A</name></author></entry></feed>`;
        return Promise.resolve({
          ok: true,
          text: async () => atom,
        } as Response);
      }
      if (url.includes('esearch')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            esearchresult: { idlist: ['999'], count: '1' },
          }),
        } as Response);
      }
      if (url.includes('esummary')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            result: {
              uids: ['999'],
              '999': {
                title: 'Article',
                authors: [{ name: 'A' }],
                source: 'J',
                pubdate: '2020 Jan',
                pubtype: ['Journal Article'],
              },
            },
          }),
        } as Response);
      }
      return Promise.resolve({ ok: false, status: 404 } as Response);
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('searchPubMed returns pmids', async () => {
    const store = makeStore();
    const result = await store.dispatch(
      researchApi.endpoints.searchPubMed.initiate({ query: 'cancer' }),
    );
    if ('data' in result && result.data) {
      expect(result.data.pmids).toContain('999');
    } else {
      expect.fail('expected data');
    }
  });

  it('getPubMedAbstract returns trimmed text', async () => {
    const store = makeStore();
    const result = await store.dispatch(researchApi.endpoints.getPubMedAbstract.initiate('123'));
    if ('data' in result && result.data) {
      expect(result.data).toContain('Abstract');
    } else {
      expect.fail('expected abstract');
    }
  });

  it('searchArxiv parses Atom entries', async () => {
    const store = makeStore();
    const result = await store.dispatch(
      researchApi.endpoints.searchArxiv.initiate({ query: 'quantum' }),
    );
    if ('data' in result && result.data) {
      expect(result.data.articles.length).toBe(1);
      expect(result.data.query).toBe('quantum');
    } else {
      expect.fail('expected arxiv data');
    }
  });

  it('getPubMedDetails maps esummary', async () => {
    const store = makeStore();
    const result = await store.dispatch(
      researchApi.endpoints.getPubMedDetails.initiate({ pmids: ['999'] }),
    );
    if ('data' in result && result.data?.length) {
      expect(result.data[0].pmid).toBe('999');
      expect(result.data[0].title).toBe('Article');
    } else {
      expect.fail('expected articles');
    }
  });
});
