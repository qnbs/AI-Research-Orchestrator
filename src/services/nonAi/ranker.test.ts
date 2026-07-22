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
