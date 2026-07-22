import { describe, it, expect } from 'vitest';
import type { RankedArticle } from '../../types';
import {
  deduplicateArticles,
  cleanArticleMetadata,
  cleanArticles,
  mergeAndCurate,
  enrichArticles,
  classifyArticleType,
} from './curator';

function makeArticle(overrides: Partial<RankedArticle> = {}): RankedArticle {
  return {
    pmid: '12345',
    title: 'Article One',
    authors: 'Author A',
    journal: 'Journal A',
    pubYear: '2023',
    summary: 'Summary one.',
    relevanceScore: 80,
    relevanceExplanation: 'Test',
    keywords: ['test'],
    isOpenAccess: true,
    ...overrides,
  };
}

describe('classifyArticleType', () => {
  it.each([
    ['A meta-analysis of trials', '', 'Meta-Analysis'],
    ['A systematic review of studies', '', 'Systematic Review'],
    ['A randomized controlled trial of drug X', '', 'Randomized Controlled Trial'],
    ['An RCT of drug Y', '', 'Randomized Controlled Trial'],
    ['A cohort study of exposure', '', 'Observational Study'],
    ['A review of the field', '', 'Review'],
    ['A basic science paper', '', 'Other'],
  ])('classifies "%s" as %s', (title, summary, expected) => {
    expect(classifyArticleType(title, summary)).toBe(expected);
  });
});

describe('curator', () => {
  const mockArticles: RankedArticle[] = [
    makeArticle({ pmid: '12345', title: 'Article One' }),
    makeArticle({ pmid: '12345', title: 'Article One Duplicate' }),
    makeArticle({ pmid: '67890', title: 'Article Two', journal: 'Journal B', isOpenAccess: false }),
  ];

  it('deduplicates articles by PMID', () => {
    const deduped = deduplicateArticles(mockArticles);
    expect(deduped.length).toBe(2);
  });

  it('deduplicates articles by normalized title when PMIDs differ', () => {
    const deduped = deduplicateArticles([
      makeArticle({ pmid: 'a', title: 'Same Title' }),
      makeArticle({ pmid: 'b', title: '  same   title  ' }),
    ]);
    expect(deduped.length).toBe(1);
  });

  it('cleans article metadata, preserving title/journal for display', () => {
    const cleaned = cleanArticleMetadata(makeArticle({ title: '  Article One  ' }));
    expect(cleaned.title).toBe('Article One');
    expect(cleaned.authors).toBe('Author A');
  });

  it('cleans a batch of articles', () => {
    const cleaned = cleanArticles(mockArticles);
    expect(cleaned).toHaveLength(3);
  });

  it('merges and curates pubmed + arxiv articles with dedup', () => {
    const merged = mergeAndCurate(mockArticles, []);
    expect(merged.length).toBe(2);
  });

  it('enriches articles with a classified article type, not a placeholder', () => {
    const enriched = enrichArticles([
      makeArticle({ title: 'A systematic review of aspirin trials', articleType: undefined }),
    ]);
    expect(enriched[0].articleType).toBe('Systematic Review');
  });

  it('preserves an already-set article type instead of reclassifying', () => {
    const enriched = enrichArticles([makeArticle({ articleType: 'Preprint' })]);
    expect(enriched[0].articleType).toBe('Preprint');
  });

  it('builds an extractive aiSummary when none is present', () => {
    const enriched = enrichArticles([
      makeArticle({
        summary: 'First sentence here. Second sentence here. Third sentence here.',
        aiSummary: undefined,
      }),
    ]);
    expect(enriched[0].aiSummary).toBeTruthy();
    expect(enriched[0].aiSummary).toContain('First sentence');
  });

  it('preserves an already-set aiSummary instead of rebuilding it', () => {
    const enriched = enrichArticles([makeArticle({ aiSummary: 'Existing AI summary.' })]);
    expect(enriched[0].aiSummary).toBe('Existing AI summary.');
  });

  it('computes a word count from the summary', () => {
    const enriched = enrichArticles([makeArticle({ summary: 'one two three four five' })]);
    expect(enriched[0].wordCount).toBeGreaterThan(0);
  });

  it('defaults keywords to an empty array when absent', () => {
    const enriched = enrichArticles([makeArticle({ keywords: undefined as unknown as string[] })]);
    expect(enriched[0].keywords).toEqual([]);
  });
});
