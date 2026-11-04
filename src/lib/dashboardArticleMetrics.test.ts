import { describe, it, expect } from 'vitest';
import {
  classifyDashboardOpenAccess,
  classifyDashboardRetrievalSource,
  countDashboardOpenAccessBuckets,
  countDashboardRetrievalSources,
} from './dashboardArticleMetrics';
import type { RankedArticle } from '../types';

const base = (over: Partial<RankedArticle>): RankedArticle => ({
  pmid: '1',
  articleId: { type: 'pmid', value: '1' },
  title: 'T',
  authors: 'A',
  journal: 'J',
  pubYear: '2024',
  summary: '',
  relevanceScore: 50,
  relevanceExplanation: '',
  keywords: [],
  isOpenAccess: false,
  ...over,
});

describe('dashboardArticleMetrics', () => {
  it('classifies arXiv and explicit OA as open', () => {
    expect(
      classifyDashboardOpenAccess(
        base({ pmid: 'arxiv:2301.00001', articleId: { type: 'arxiv', value: '2301.00001' } }),
      ),
    ).toBe('open');
    expect(classifyDashboardOpenAccess(base({ isOpenAccess: true }))).toBe('open');
  });

  it('does not treat missing OA evidence as closed', () => {
    expect(classifyDashboardOpenAccess(base({ isOpenAccess: false, pmcId: undefined }))).toBe(
      'unknown',
    );
    const counts = countDashboardOpenAccessBuckets([
      base({ isOpenAccess: true }),
      base({ pmid: '2', articleId: { type: 'pmid', value: '2' }, isOpenAccess: false }),
    ]);
    expect(counts.open).toBe(1);
    expect(counts.unknown).toBe(1);
    expect(counts.closed).toBe(0);
  });

  it('classifies retrieval sources without labeling all non-arXiv as PubMed', () => {
    expect(classifyDashboardRetrievalSource(base({ pmid: '99' }))).toBe('pubmed');
    expect(
      classifyDashboardRetrievalSource(
        base({ pmid: 'arxiv:2301.00002', articleId: { type: 'arxiv', value: '2301.00002' } }),
      ),
    ).toBe('arxiv');
    expect(
      classifyDashboardRetrievalSource(
        base({ pmid: 'doi:10.1/x', articleId: { type: 'doi', value: '10.1/x' } }),
      ),
    ).toBe('other');
    const sources = countDashboardRetrievalSources([
      base({ pmid: '1' }),
      base({ pmid: 'arxiv:2301.00003', articleId: { type: 'arxiv', value: '2301.00003' } }),
      base({ pmid: 'doi:10.2/y', articleId: { type: 'doi', value: '10.2/y' } }),
    ]);
    expect(sources).toEqual({ pubmed: 1, arxiv: 1, other: 1 });
  });
});
