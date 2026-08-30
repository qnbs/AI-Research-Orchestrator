import { describe, it, expect } from 'vitest';
import type { RankedArticle } from '../../types';
import { rankArticles, getTopArticles } from './ranker';

const mockArticles: RankedArticle[] = [
  {
    pmid: '12345',
    title: 'Diabetes Treatment Study',
    authors: 'Author A',
    journal: 'Journal A',
    pubYear: '2023',
    summary: 'A study about diabetes treatment and management',
    relevanceScore: 0,
    relevanceExplanation: '',
    keywords: ['diabetes', 'treatment'],
    isOpenAccess: true,
    articleType: 'Randomized Controlled Trial',
  },
  {
    pmid: '67890',
    title: 'Cancer Research',
    authors: 'Author B',
    journal: 'Journal B',
    pubYear: '2020',
    summary: 'Cancer research and immunotherapy',
    relevanceScore: 0,
    relevanceExplanation: '',
    keywords: ['cancer'],
    isOpenAccess: false,
    articleType: 'Review',
  },
];

describe('rankArticles', () => {
  it('ranks articles by relevance to the query, most relevant first', () => {
    const ranked = rankArticles(mockArticles, 'diabetes treatment');
    expect(ranked.length).toBe(2);
    expect(ranked[0].pmid).toBe('12345');
    expect(ranked[0].relevanceScore).toBeGreaterThan(0);
    expect(ranked[0].relevanceScore).toBeGreaterThanOrEqual(ranked[1].relevanceScore);
  });

  it('provides a human-readable scoring explanation', () => {
    const ranked = rankArticles(mockArticles, 'diabetes treatment');
    expect(ranked[0].relevanceExplanation).toBeTruthy();
    expect(ranked[0].scoringExplanation).toBeDefined();
  });

  it('boosts high-quality publication types via the pub-type score', () => {
    const ranked = rankArticles(mockArticles, 'medical research');
    const rct = ranked.find((a) => a.pmid === '12345');
    expect(rct?.scoringExplanation?.pubTypeBoost).toBe(1);
  });

  it('gives an open-access bonus', () => {
    const ranked = rankArticles(mockArticles, 'medical research');
    const oa = ranked.find((a) => a.pmid === '12345');
    expect(oa?.scoringExplanation?.openAccess).toBe(1);
  });

  it('accepts custom ranking weights', () => {
    const ranked = rankArticles(mockArticles, 'diabetes', { recencyDecay: 1 });
    expect(ranked.length).toBe(2);
  });

  it('returns an empty array for an empty article list', () => {
    expect(rankArticles([], 'diabetes')).toEqual([]);
  });

  it('labels scores as a relative rank in this result set', () => {
    const ranked = rankArticles(mockArticles, 'diabetes treatment');
    expect(ranked[0].relevanceExplanation).toMatch(/Relative rank in this result set/i);
    expect(ranked[0].relevanceScale).toBe('relative');
    expect(ranked[0].relevanceScore).toBeGreaterThanOrEqual(0);
    expect(ranked[0].relevanceScore).toBeLessThanOrEqual(100);
  });

  it('min-maxes mixed raw scores so the best hit is 100 and the worst is 0 when they differ', () => {
    const ranked = rankArticles(mockArticles, 'diabetes treatment');
    const scores = ranked.map((a) => a.relevanceScore);
    expect(Math.max(...scores)).toBe(100);
    expect(Math.min(...scores)).toBe(0);
  });

  it('keeps a non-negative BM25 contribution when the query term is in every document', () => {
    const corpus: RankedArticle[] = [
      { ...mockArticles[0], pmid: '1', title: 'Diabetes notes', summary: 'diabetes overview' },
      { ...mockArticles[1], pmid: '2', title: 'Diabetes review', summary: 'diabetes overview' },
    ];
    const ranked = rankArticles(corpus, 'diabetes');
    for (const article of ranked) {
      expect(article.scoringExplanation?.baseScore).toBeGreaterThanOrEqual(0);
    }
    expect(ranked[0].pmid).toBe('1');
  });
});

describe('getTopArticles', () => {
  it('truncates to the requested count', () => {
    const ranked = rankArticles(mockArticles, 'diabetes treatment');
    expect(getTopArticles(ranked, 1)).toHaveLength(1);
  });

  it('defaults to 10 when no count is given', () => {
    const ranked = rankArticles(mockArticles, 'diabetes treatment');
    expect(getTopArticles(ranked)).toHaveLength(2);
  });
});
