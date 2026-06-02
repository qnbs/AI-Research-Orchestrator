import { describe, it, expect } from 'vitest';
import { kbEntryChangesWithArticles, kbEntryTitleChanges } from './kbEntryUpdates';
import type { AuthorProfileEntry, JournalEntry, ResearchEntry } from '../types';

const article = {
  pmid: '1',
  title: 'T',
  summary: 's',
  authors: 'a',
  journal: 'j',
  pubYear: '2024',
  keywords: [],
  relevanceScore: 1,
  relevanceExplanation: '',
  isOpenAccess: false,
};

const researchEntry: ResearchEntry = {
  id: 'r1',
  timestamp: 1,
  sourceType: 'research',
  title: 'Old topic',
  articles: [article],
  input: {
    researchTopic: 'Old topic',
    dateRange: 'any',
    articleTypes: [],
    synthesisFocus: 'f',
    maxArticlesToScan: 1,
    topNToSynthesize: 1,
    includeArxiv: false,
  },
  report: {
    generatedQueries: [],
    rankedArticles: [article],
    synthesis: '',
    aiGeneratedInsights: [],
    overallKeywords: [],
  },
};

describe('kbEntryUpdates', () => {
  it('kbEntryChangesWithArticles syncs research report rankedArticles', () => {
    const next = [{ ...article, pmid: '2' }];
    const changes = kbEntryChangesWithArticles(researchEntry, next);
    expect(changes.articles).toEqual(next);
    expect(changes).toMatchObject({
      report: { rankedArticles: next },
    });
  });

  it('kbEntryTitleChanges updates research input topic', () => {
    const changes = kbEntryTitleChanges(researchEntry, 'New topic');
    expect(changes).toEqual({
      title: 'New topic',
      input: { ...researchEntry.input, researchTopic: 'New topic' },
    });
  });

  it('kbEntryTitleChanges updates author and journal fields', () => {
    const author: AuthorProfileEntry = {
      ...researchEntry,
      id: 'a1',
      sourceType: 'author',
      title: 'Author',
      input: { authorName: 'Author', maxArticles: 5 },
      profile: { publications: [], summary: '' },
    };
    expect(kbEntryTitleChanges(author, 'Renamed').input).toEqual({
      authorName: 'Renamed',
      maxArticles: 5,
    });

    const journal: JournalEntry = {
      ...researchEntry,
      id: 'j1',
      sourceType: 'journal',
      title: 'Journal',
      journalProfile: { name: 'Journal', issn: '', publications: [] },
    };
    expect(kbEntryTitleChanges(journal, 'J2').journalProfile?.name).toBe('J2');
  });
});
