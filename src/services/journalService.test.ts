import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findArticlesInJournal } from './journalService';
import * as pubmed from './pubmedUtils';

vi.mock('./pubmedUtils', () => ({
  searchPubMedForIds: vi.fn(),
  fetchArticleDetails: vi.fn(),
}));

vi.mock('./geminiService', () => ({
  generateJournalProfileAnalysis: vi.fn(),
}));

describe('journalService', () => {
  beforeEach(() => {
    vi.mocked(pubmed.searchPubMedForIds).mockResolvedValue(['1']);
    vi.mocked(pubmed.fetchArticleDetails).mockResolvedValue([
      {
        pmid: '1',
        title: 'T',
        summary: 'S',
        authors: 'A',
        journal: 'J',
        pubYear: '2020',
        keywords: [],
        relevanceScore: 0,
        relevanceExplanation: '',
      },
    ]);
  });

  it('findArticlesInJournal returns mapped articles', async () => {
    const articles = await findArticlesInJournal('Nature', 'crispr', true);
    expect(articles).toHaveLength(1);
    expect(articles[0].pmid).toBe('1');
    expect(pubmed.searchPubMedForIds).toHaveBeenCalled();
  });

  it('propagates AbortSignal to PubMed helpers', async () => {
    const ac = new AbortController();
    await findArticlesInJournal('Nature', '', false, ac.signal);
    expect(pubmed.searchPubMedForIds).toHaveBeenCalledWith(expect.any(String), 50, ac.signal);
  });
});
