import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  disambiguateJournal,
  findArticlesInJournal,
  generateJournalProfileAnalysis,
  suggestJournals,
} from './journalService';
import * as pubmed from './pubmedUtils';
import * as gemini from './geminiService';
import type { Settings } from '../types';

vi.mock('./pubmedUtils', () => ({
  searchPubMedForIds: vi.fn(),
  fetchArticleDetails: vi.fn(),
}));

vi.mock('./geminiService', () => ({
  generateJournalProfileAnalysis: vi.fn(),
  disambiguateJournal: vi.fn(),
  suggestJournals: vi.fn(),
}));

const mockAiSettings = { model: 'gemini-2.5-flash' } as Settings['ai'];

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

  it('passes fetched articles through to profile generation', async () => {
    const articles = await findArticlesInJournal('Nature', '', true);
    vi.mocked(gemini.generateJournalProfileAnalysis).mockResolvedValue({
      name: 'Nature',
      issn: '0028-0836',
      description: 'd',
      oaPolicy: 'Hybrid',
      focusAreas: [],
    });
    await generateJournalProfileAnalysis('Nature', mockAiSettings, undefined, articles);
    expect(gemini.generateJournalProfileAnalysis).toHaveBeenCalledWith(
      'Nature',
      mockAiSettings,
      undefined,
      articles,
    );
  });

  it('delegates disambiguation to the AI service', async () => {
    vi.mocked(gemini.disambiguateJournal).mockResolvedValue([
      { name: 'BMJ', description: 'd', matchType: 'exact', confidence: 95 },
    ]);
    const candidates = await disambiguateJournal('BMJ', mockAiSettings);
    expect(candidates).toHaveLength(1);
    expect(gemini.disambiguateJournal).toHaveBeenCalledWith('BMJ', mockAiSettings, undefined);
  });

  it('delegates journal suggestions to the AI service', async () => {
    vi.mocked(gemini.suggestJournals).mockResolvedValue([
      { name: 'The Lancet Oncology', description: 'd' },
    ]);
    const suggestions = await suggestJournals('oncology', mockAiSettings);
    expect(suggestions[0].name).toBe('The Lancet Oncology');
    expect(gemini.suggestJournals).toHaveBeenCalledWith('oncology', mockAiSettings, undefined);
  });

  it('rethrows service errors for disambiguation and suggestions', async () => {
    vi.mocked(gemini.disambiguateJournal).mockRejectedValue(new Error('boom'));
    await expect(disambiguateJournal('X', mockAiSettings)).rejects.toThrow('boom');
    vi.mocked(gemini.suggestJournals).mockRejectedValue(new Error('boom'));
    await expect(suggestJournals('X', mockAiSettings)).rejects.toThrow('boom');
  });
});
