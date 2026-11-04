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
  it('classifies arXiv and free-full-text flags as open', () => {
    expect(
      classifyDashboardOpenAccess(
        base({
          pmid: 'arxiv:2301.00001',
          articleId: { type: 'arxiv', value: '2301.00001' },
          sourceClass: 'arxiv-retrieved',
        }),
      ),
    ).toBe('open');
    expect(classifyDashboardOpenAccess(base({ isOpenAccess: true, pmcId: 'PMC123' }))).toBe('open');
  });

  it('does not treat missing OA evidence as closed', () => {
    expect(classifyDashboardOpenAccess(base({ isOpenAccess: false }))).toBe('unknown');
    const counts = countDashboardOpenAccessBuckets([
      base({ isOpenAccess: true }),
      base({ pmid: '2', articleId: { type: 'pmid', value: '2' }, isOpenAccess: false }),
    ]);
    expect(counts).toMatchObject({ open: 1, unknown: 1, closed: 0 });
  });

  it('uses sourceClass for retrieval provenance', () => {
    expect(
      classifyDashboardRetrievalSource(
        base({ pmid: '999', sourceClass: 'pubmed-retrieved', retrievalSource: 'pubmed_efetch' }),
      ),
    ).toBe('pubmed');
    expect(
      classifyDashboardRetrievalSource(
        base({
          pmid: '888',
          sourceClass: 'user-imported',
          articleId: { type: 'pmid', value: '888' },
        }),
      ),
    ).toBe('other');
    expect(
      classifyDashboardRetrievalSource(
        base({
          pmid: '777',
          sourceClass: 'demo-synthetic',
          articleId: { type: 'demo', value: '777' },
        }),
      ),
    ).toBe('other');
    expect(
      classifyDashboardRetrievalSource(
        base({
          pmid: 'arxiv:2301.00002',
          articleId: { type: 'arxiv', value: '2301.00002' },
          sourceClass: 'arxiv-retrieved',
        }),
      ),
    ).toBe('arxiv');
  });

  it('does not label legacy PMID-only records as PubMed without retrieval provenance', () => {
    expect(classifyDashboardRetrievalSource(base({ pmid: '12345' }))).toBe('other');
    expect(
      classifyDashboardRetrievalSource(
        base({
          pmid: '12345',
          retrievalSource: 'pubmed_esummary',
          sourceClass: 'pubmed-retrieved',
        }),
      ),
    ).toBe('pubmed');
  });

  it('aggregates mixed corpus counts', () => {
    const sources = countDashboardRetrievalSources([
      base({ pmid: '1', sourceClass: 'pubmed-retrieved', retrievalSource: 'pubmed_efetch' }),
      base({
        pmid: 'arxiv:2301.00003',
        articleId: { type: 'arxiv', value: '2301.00003' },
        sourceClass: 'arxiv-retrieved',
      }),
      base({
        pmid: 'doi:10.2/y',
        articleId: { type: 'doi', value: '10.2/y' },
        sourceClass: 'user-imported',
      }),
      base({ pmid: '99999' }),
    ]);
    expect(sources).toEqual({ pubmed: 1, arxiv: 1, other: 2 });
  });
});
