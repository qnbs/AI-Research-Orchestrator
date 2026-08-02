import { describe, expect, it } from 'vitest';
import type { AuthorProfileEntry, RankedArticle, ResearchEntry } from '../types';
import {
  buildHarmonizeDuplicateUpdates,
  countDuplicateArticleGroups,
  countResearchPruneCandidates,
  pickCanonicalArticle,
  selectResearchPrunePmids,
} from './knowledgeBaseDedup';

const makeArticle = (pmid: string, score: number, tags?: string[]): RankedArticle => ({
  pmid,
  title: `Article ${pmid}`,
  authors: 'Smith J',
  journal: 'Demo Journal',
  pubYear: '2024',
  summary: 'Summary',
  relevanceScore: score,
  relevanceExplanation: '',
  keywords: [],
  isOpenAccess: false,
  customTags: tags,
});

const makeResearchEntry = (id: string, articles: RankedArticle[]): ResearchEntry => ({
  id,
  timestamp: 1,
  title: `Report ${id}`,
  sourceType: 'research',
  articles,
  input: {
    researchTopic: 'topic',
    dateRange: 'any',
    articleTypes: [],
    synthesisFocus: 'overview',
    maxArticlesToScan: 10,
    topNToSynthesize: 5,
  },
  report: {
    generatedQueries: [],
    rankedArticles: articles,
    synthesis: '',
    aiGeneratedInsights: [],
    overallKeywords: [],
  },
});

const makeAuthorEntry = (id: string, articles: RankedArticle[]): AuthorProfileEntry => ({
  id,
  timestamp: 1,
  title: 'Smith',
  sourceType: 'author',
  articles,
  input: { authorName: 'Smith' },
  profile: {
    name: 'Smith',
    affiliations: [],
    metrics: {
      hIndex: null,
      totalCitations: null,
      publicationCount: articles.length,
      publicationsPerYear: {},
      publicationsAsFirstAuthor: 0,
      publicationsAsLastAuthor: 0,
    },
    careerSummary: '',
    coreConcepts: [],
    publications: articles,
  },
});

describe('pickCanonicalArticle', () => {
  it('prefers the highest relevance score', () => {
    const winner = pickCanonicalArticle([makeArticle('1', 10), makeArticle('1', 42)]);
    expect(winner.relevanceScore).toBe(42);
  });
});

describe('buildHarmonizeDuplicateUpdates', () => {
  it('does not remove duplicate articles from snapshots', () => {
    const low = makeArticle('100', 10, ['old']);
    const high = makeArticle('100', 90, ['canonical']);
    const entryA = makeResearchEntry('a', [low]);
    const entryB = makeResearchEntry('b', [high]);

    const { updates, harmonizedCopies } = buildHarmonizeDuplicateUpdates([entryA, entryB]);

    expect(harmonizedCopies).toBe(1);
    expect(updates.length).toBe(1);
    expect(updates[0].id).toBe('a');
    expect(updates[0].changes.articles?.length).toBe(1);
    expect(updates[0].changes.articles?.[0].customTags).toEqual(['canonical']);
    expect(updates[0].changes.articles?.[0].relevanceScore).toBe(90);
    expect('report' in updates[0].changes ? updates[0].changes.report : undefined).toBeUndefined();

    // Both entries still retain their article row
    const mergedA = { ...entryA, ...updates[0].changes };
    const mergedB = entryB;
    expect(mergedA.articles.length + mergedB.articles.length).toBe(2);
    expect(entryA.report.rankedArticles[0].customTags).toEqual(['old']);
  });

  it('returns no updates when duplicates already match', () => {
    const article = makeArticle('1', 50, ['tag']);
    const entries = [makeResearchEntry('a', [article]), makeResearchEntry('b', [{ ...article }])];
    const { updates, harmonizedCopies } = buildHarmonizeDuplicateUpdates(entries);
    expect(updates).toHaveLength(0);
    expect(harmonizedCopies).toBe(0);
  });

  it('harmonizes author profile publications for duplicate PMIDs', () => {
    const low = makeArticle('200', 20, ['old']);
    const high = makeArticle('200', 80, ['winner']);
    const research = makeResearchEntry('r1', [high]);
    const author = makeAuthorEntry('auth', [low]);

    const { updates, harmonizedCopies } = buildHarmonizeDuplicateUpdates([research, author]);

    expect(harmonizedCopies).toBe(1);
    const authorUpdate = updates.find((u) => u.id === 'auth');
    const authorChanges = authorUpdate?.changes as Partial<AuthorProfileEntry>;
    expect(authorChanges.profile?.publications?.[0].customTags).toEqual(['winner']);
    expect(authorChanges.profile?.publications?.[0].relevanceScore).toBe(80);
  });
});

describe('countDuplicateArticleGroups', () => {
  it('counts pmid groups appearing in more than one entry', () => {
    const entries = [
      makeResearchEntry('a', [makeArticle('1', 1)]),
      makeResearchEntry('b', [makeArticle('1', 2), makeArticle('2', 3)]),
    ];
    expect(countDuplicateArticleGroups(entries)).toBe(1);
  });

  it('ignores duplicate PMIDs within a single entry', () => {
    const entries = [makeResearchEntry('a', [makeArticle('1', 1), makeArticle('1', 2)])];
    expect(countDuplicateArticleGroups(entries)).toBe(0);
  });
});

describe('selectResearchPrunePmids', () => {
  it('includes low-scoring research articles from all research copies', () => {
    const research = makeResearchEntry('r1', [makeArticle('1', 0)]);
    const authorEntry = makeAuthorEntry('auth', [makeArticle('2', 0)]);

    const pmids = selectResearchPrunePmids([research, authorEntry], 1);

    expect(pmids).toEqual(['1']);
  });

  it('finds low-scoring research copy even when author copy has higher score', () => {
    const researchLow = makeArticle('100', 5, []);
    const authorHigh = makeArticle('100', 95, []);
    const research = makeResearchEntry('r1', [researchLow]);
    const author = makeAuthorEntry('auth', [authorHigh]);

    const pmids = selectResearchPrunePmids([research, author], 10);

    expect(pmids).toEqual(['100']);
  });
});

describe('countResearchPruneCandidates', () => {
  it('matches selectResearchPrunePmids length', () => {
    const entries = [
      makeResearchEntry('a', [makeArticle('1', 0), makeArticle('2', 50)]),
      makeAuthorEntry('auth', [makeArticle('3', 0)]),
    ];
    expect(countResearchPruneCandidates(entries, 10)).toBe(1);
  });
});
