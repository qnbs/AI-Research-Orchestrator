import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resetAllCircuitBreakers } from '../../lib/circuitBreaker';
import type { BuiltQuery } from './types';

const mockPubMed = vi.hoisted(() => ({
  searchPubMedForIds: vi.fn(),
  fetchArticleDetails: vi.fn(),
}));

vi.mock('../pubmedUtils', () => ({
  searchPubMedForIds: (...args: unknown[]) => mockPubMed.searchPubMedForIds(...args),
  fetchArticleDetails: (...args: unknown[]) => mockPubMed.fetchArticleDetails(...args),
}));

const mockArxiv = vi.hoisted(() => ({
  searchAndFetchArxiv: vi.fn(),
}));

vi.mock('../arxivUtils', () => ({
  searchAndFetchArxiv: (...args: unknown[]) => mockArxiv.searchAndFetchArxiv(...args),
}));

vi.mock('../apiKeyService', () => ({
  getNcbiApiKey: vi.fn().mockResolvedValue(null),
}));

import { retrieveArticles } from './retriever';

function query(q: string): BuiltQuery {
  return { query: q, explanation: '', meshTerms: [], expandedTerms: [] };
}

describe('retrieveArticles', () => {
  beforeEach(() => {
    resetAllCircuitBreakers();
    vi.clearAllMocks();
    mockArxiv.searchAndFetchArxiv.mockResolvedValue([]);
  });

  it('retrieves and fills defaults for PubMed articles', async () => {
    mockPubMed.searchPubMedForIds.mockResolvedValue(['1', '2']);
    mockPubMed.fetchArticleDetails.mockResolvedValue([
      { pmid: '1', title: 'Title 1' },
      { pmid: '2', title: 'Title 2', isOpenAccess: true },
    ]);

    const result = await retrieveArticles([query('cancer')], { maxArxiv: 0 });

    expect(result.pubmedCount).toBe(2);
    expect(result.pubmedArticles[0]).toMatchObject({
      pmid: '1',
      title: 'Title 1',
      authors: '',
      summary: '',
      isOpenAccess: false,
    });
    expect(result.pubmedArticles[1].isOpenAccess).toBe(true);
    expect(result.arxivCount).toBe(0);
  });

  it('deduplicates PMIDs across multiple queries', async () => {
    mockPubMed.searchPubMedForIds
      .mockResolvedValueOnce(['1', '2'])
      .mockResolvedValueOnce(['2', '3']);
    mockPubMed.fetchArticleDetails.mockResolvedValue([
      { pmid: '1', title: 'A' },
      { pmid: '2', title: 'B' },
      { pmid: '3', title: 'C' },
    ]);

    await retrieveArticles([query('a'), query('b')], { maxArxiv: 0 });

    const fetchedIds = mockPubMed.fetchArticleDetails.mock.calls[0][0];
    expect(fetchedIds).toEqual(['1', '2', '3']);
  });

  it('skips arXiv entirely when maxArxiv is 0', async () => {
    mockPubMed.searchPubMedForIds.mockResolvedValue([]);
    mockPubMed.fetchArticleDetails.mockResolvedValue([]);

    const result = await retrieveArticles([query('x')], { maxArxiv: 0 });

    expect(mockArxiv.searchAndFetchArxiv).not.toHaveBeenCalled();
    expect(result.arxivCount).toBe(0);
  });

  it('fetches and defaults arXiv results with a preprint score/type', async () => {
    mockPubMed.searchPubMedForIds.mockResolvedValue([]);
    mockPubMed.fetchArticleDetails.mockResolvedValue([]);
    mockArxiv.searchAndFetchArxiv.mockResolvedValue([{ pmid: 'arxiv:1', title: 'Preprint A' }]);

    const result = await retrieveArticles([query('x')], { maxArxiv: 5 });

    expect(result.arxivCount).toBe(1);
    expect(result.arxivArticles[0]).toMatchObject({
      relevanceScore: 50,
      relevanceExplanation: 'arXiv preprint (initial score)',
      articleType: 'Preprint',
      isOpenAccess: true,
    });
  });

  it('throws STREAM_ABORTED when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      retrieveArticles([query('x')], { signal: controller.signal }),
    ).rejects.toMatchObject({ code: 'STREAM_ABORTED' });
  });

  it('continues with remaining queries when one PubMed search fails', async () => {
    mockPubMed.searchPubMedForIds
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce(['1']);
    mockPubMed.fetchArticleDetails.mockResolvedValue([{ pmid: '1', title: 'Recovered' }]);

    const result = await retrieveArticles([query('bad'), query('good')], { maxArxiv: 0 });

    expect(result.pubmedCount).toBe(1);
    expect(result.pubmedArticles[0].pmid).toBe('1');
  });

  it('isolates a fetchArticleDetails failure and still attempts arXiv', async () => {
    mockPubMed.searchPubMedForIds.mockResolvedValue(['1']);
    mockPubMed.fetchArticleDetails.mockRejectedValue(new Error('fetch failed'));
    mockArxiv.searchAndFetchArxiv.mockResolvedValue([{ pmid: 'arxiv:1', title: 'Preprint' }]);

    const result = await retrieveArticles([query('x')], { maxArxiv: 5 });

    expect(result.pubmedArticles).toEqual([]);
    expect(result.arxivArticles).toHaveLength(1);
  });

  it('still throws when the signal aborts mid fetchArticleDetails', async () => {
    mockPubMed.searchPubMedForIds.mockResolvedValue(['1']);
    const abortError = new DOMException('Aborted', 'AbortError');
    mockPubMed.fetchArticleDetails.mockRejectedValue(abortError);

    await expect(retrieveArticles([query('x')], { maxArxiv: 0 })).rejects.toMatchObject({
      code: 'STREAM_ABORTED',
    });
  });

  it('still throws when the signal aborts mid PubMed-search', async () => {
    const abortError = new DOMException('Aborted', 'AbortError');
    mockPubMed.searchPubMedForIds.mockRejectedValue(abortError);

    await expect(retrieveArticles([query('x')], { maxArxiv: 0 })).rejects.toMatchObject({
      code: 'STREAM_ABORTED',
    });
  });

  it('still throws when the signal aborts mid arXiv search', async () => {
    mockPubMed.searchPubMedForIds.mockResolvedValue([]);
    mockPubMed.fetchArticleDetails.mockResolvedValue([]);
    const abortError = new DOMException('Aborted', 'AbortError');
    mockArxiv.searchAndFetchArxiv.mockRejectedValue(abortError);

    await expect(retrieveArticles([query('x')], { maxArxiv: 5 })).rejects.toMatchObject({
      code: 'STREAM_ABORTED',
    });
  });

  it('swallows an arXiv failure and returns empty arxivArticles', async () => {
    mockPubMed.searchPubMedForIds.mockResolvedValue([]);
    mockPubMed.fetchArticleDetails.mockResolvedValue([]);
    mockArxiv.searchAndFetchArxiv.mockRejectedValue(new Error('arxiv down'));

    const result = await retrieveArticles([query('x')], { maxArxiv: 5 });

    expect(result.arxivCount).toBe(0);
    expect(result.arxivArticles).toEqual([]);
  });

  it('opens the circuit breaker after repeated pubmed-search failures and keeps degrading gracefully', async () => {
    mockPubMed.searchPubMedForIds.mockRejectedValue(new Error('down'));
    mockPubMed.fetchArticleDetails.mockResolvedValue([]);

    const manyQueries = Array.from({ length: 6 }, (_, i) => query(`q${i}`));
    const result = await retrieveArticles(manyQueries, { maxArxiv: 0 });

    // The first 5 queries each fail and trip the breaker (failureThreshold defaults to 5);
    // once open, withCircuitBreaker's assertClosed() throws before ever calling the
    // underlying function again, so the 6th query never reaches the mock at all -
    // retriever.ts's per-query try/catch swallows both failure types identically either way.
    expect(mockPubMed.searchPubMedForIds).toHaveBeenCalledTimes(5);
    expect(result.pubmedCount).toBe(0);
  });

  it('continues without an NCBI key when the key lookup itself fails', async () => {
    const { getNcbiApiKey } = await import('../apiKeyService');
    vi.mocked(getNcbiApiKey).mockRejectedValueOnce(new Error('vault error'));
    mockPubMed.searchPubMedForIds.mockResolvedValue([]);
    mockPubMed.fetchArticleDetails.mockResolvedValue([]);

    const result = await retrieveArticles([query('x')], { maxArxiv: 0 });

    expect(result.pubmedCount).toBe(0);
    expect(mockPubMed.searchPubMedForIds).toHaveBeenCalledWith(
      'x',
      expect.any(Number),
      undefined,
      undefined,
    );
  });
});
