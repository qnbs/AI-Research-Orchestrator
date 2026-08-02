import { describe, expect, it } from 'vitest';
import type { KnowledgeBaseEntry, RankedArticle } from '../types';
import {
  buildHarmonizeDuplicateUpdates,
  countDuplicateArticleGroups,
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

const makeResearchEntry = (id: string, articles: RankedArticle[]): KnowledgeBaseEntry => ({
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

    // Both entries still retain their article row
    const mergedA = { ...entryA, ...updates[0].changes };
    const mergedB = entryB;
    expect(mergedA.articles.length + mergedB.articles.length).toBe(2);
  });

  it('returns no updates when duplicates already match', () => {
    const article = makeArticle('1', 50, ['tag']);
    const entries = [makeResearchEntry('a', [article]), makeResearchEntry('b', [{ ...article }])];
    const { updates, harmonizedCopies } = buildHarmonizeDuplicateUpdates(entries);
    expect(updates).toHaveLength(0);
    expect(harmonizedCopies).toBe(0);
  });
});

describe('countDuplicateArticleGroups', () => {
  it('counts pmid groups appearing more than once', () => {
    const entries = [
      makeResearchEntry('a', [makeArticle('1', 1)]),
      makeResearchEntry('b', [makeArticle('1', 2), makeArticle('2', 3)]),
    ];
    expect(countDuplicateArticleGroups(entries)).toBe(1);
  });
});

describe('selectResearchPrunePmids', () => {
  it('excludes author-profile articles even when score is zero', () => {
    const research = makeResearchEntry('r1', [makeArticle('1', 0)]);
    const authorEntry: KnowledgeBaseEntry = {
      id: 'auth',
      timestamp: 1,
      title: 'Author',
      sourceType: 'author',
      articles: [makeArticle('2', 0)],
      input: { authorName: 'Smith' },
      profile: {
        name: 'Smith',
        affiliations: [],
        metrics: {
          hIndex: null,
          totalCitations: null,
          publicationCount: 1,
          publicationsPerYear: {},
          publicationsAsFirstAuthor: 0,
          publicationsAsLastAuthor: 0,
        },
        careerSummary: '',
        coreConcepts: [],
        publications: [makeArticle('2', 0)],
      },
    };

    const pmids = selectResearchPrunePmids(
      [
        { pmid: '1', relevanceScore: 0, sourceId: 'r1' },
        { pmid: '2', relevanceScore: 0, sourceId: 'auth' },
      ],
      [research, authorEntry],
      1,
    );

    expect(pmids).toEqual(['1']);
  });
});
