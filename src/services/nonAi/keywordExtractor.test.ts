import { describe, it, expect } from 'vitest';
import type { RankedArticle } from '../../types';
import {
  extractKeywordsFromArticle,
  extractKeywordsFromText,
  aggregateKeywords,
  extractNgrams,
} from './keywordExtractor';

function makeArticle(overrides: Partial<RankedArticle> = {}): RankedArticle {
  return {
    pmid: '1',
    title: 'Hypertension and diabetes management',
    authors: 'Smith J',
    journal: 'Journal of Medicine',
    pubYear: '2024',
    summary: 'A study of hypertension treatment outcomes in diabetes patients.',
    relevanceScore: 80,
    relevanceExplanation: '',
    keywords: [],
    isOpenAccess: false,
    ...overrides,
  };
}

describe('extractKeywordsFromArticle', () => {
  it('returns real surface-form words, never stemmed fragments', () => {
    const keywords = extractKeywordsFromArticle(makeArticle());
    // Regression guard: this used to return stemmed fragments like "hyperten"/"diabet".
    expect(keywords).not.toContain('hyperten');
    expect(keywords).not.toContain('diabet');
    expect(keywords.some((k) => k.includes('hypertension'))).toBe(true);
    expect(keywords.some((k) => k.includes('diabetes'))).toBe(true);
  });

  it('prefers multi-word (bigram) terms via the scoring boost', () => {
    const article = makeArticle({
      title: 'Machine learning machine learning applications',
      summary: 'Machine learning is used throughout this study of machine learning models.',
    });
    const keywords = extractKeywordsFromArticle(article, 5);
    expect(keywords).toContain('machine learning');
  });

  it('respects the limit parameter', () => {
    const article = makeArticle({
      summary: 'Alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron',
    });
    const keywords = extractKeywordsFromArticle(article, 3);
    expect(keywords.length).toBeLessThanOrEqual(3);
  });

  it('is deterministic across repeated calls', () => {
    const article = makeArticle();
    expect(extractKeywordsFromArticle(article)).toEqual(extractKeywordsFromArticle(article));
  });
});

describe('aggregateKeywords', () => {
  it('aggregates and sorts by frequency across articles', () => {
    const articles = [
      makeArticle({ pmid: '1', keywords: ['cancer', 'therapy'] }),
      makeArticle({ pmid: '2', keywords: ['cancer', 'diagnosis'] }),
      makeArticle({ pmid: '3', keywords: ['cancer'] }),
    ];
    const result = aggregateKeywords(articles);
    expect(result[0]).toEqual({ keyword: 'cancer', frequency: 3 });
  });

  it('falls back to extractKeywordsFromArticle when keywords is undefined (not just empty)', () => {
    // `??` only falls through on null/undefined - an explicit [] is a valid "no keywords" value
    // and must NOT be overridden, so this specifically tests the undefined case.
    const article = makeArticle({ keywords: undefined as unknown as string[] });
    const result = aggregateKeywords([article]);
    expect(result.length).toBeGreaterThan(0);
  });

  it('keeps an explicit empty keywords array as-is, without falling back', () => {
    const article = makeArticle({ keywords: [] });
    const result = aggregateKeywords([article]);
    expect(result).toEqual([]);
  });

  it('respects the limit parameter', () => {
    const articles = Array.from({ length: 30 }, (_, i) =>
      makeArticle({ pmid: String(i), keywords: [`keyword${i}`] }),
    );
    const result = aggregateKeywords(articles, 5);
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it('excludes keywords shorter than 3 characters and trims/lowercases', () => {
    const article = makeArticle({ keywords: ['AI', 'Oncology', '  Therapy  '] });
    const result = aggregateKeywords([article]);
    const keys = result.map((r) => r.keyword);
    expect(keys).not.toContain('ai');
    expect(keys).toContain('oncology');
    expect(keys).toContain('therapy');
  });
});

describe('extractNgrams', () => {
  it('extracts bigrams by default', () => {
    const ngrams = extractNgrams('machine learning models are powerful');
    expect(ngrams).toContain('machine learning');
  });

  it('filters out ngrams shorter than 5 characters', () => {
    const ngrams = extractNgrams('a an the of to');
    expect(ngrams.every((g) => g.length >= 5)).toBe(true);
  });
});

describe('extractKeywordsFromText', () => {
  it('extracts real surface-form words from arbitrary text', () => {
    const keywords = extractKeywordsFromText('Diabetes management and hypertension control');
    expect(keywords).not.toContain('diabet');
    expect(keywords).not.toContain('hyperten');
    expect(keywords.some((k) => k.includes('diabetes'))).toBe(true);
  });

  it('respects the limit parameter', () => {
    const keywords = extractKeywordsFromText(
      'alpha beta gamma delta epsilon zeta eta theta iota kappa',
      3,
    );
    expect(keywords.length).toBeLessThanOrEqual(3);
  });

  it('is what extractKeywordsFromArticle delegates to for its composite text', () => {
    const article: RankedArticle = {
      pmid: '1',
      title: 'Diabetes management',
      authors: '',
      journal: '',
      pubYear: '2024',
      summary: 'hypertension control',
      relevanceScore: 0,
      relevanceExplanation: '',
      keywords: [],
      isOpenAccess: false,
    };
    expect(extractKeywordsFromArticle(article)).toEqual(
      extractKeywordsFromText('Diabetes management hypertension control '),
    );
  });
});
