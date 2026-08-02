import { describe, it, expect } from 'vitest';
import {
  corpusContainsDemo,
  inferArticleSourceClass,
  resolveReportCorpusClass,
  stampDemoArticle,
} from './articleSourceClass';

describe('articleSourceClass', () => {
  it('infers demo-synthetic from demo: keys', () => {
    expect(inferArticleSourceClass({ pmid: 'demo:aspirin' })).toBe('demo-synthetic');
  });

  it('infers arxiv, imported, and pubmed fallback classes', () => {
    expect(inferArticleSourceClass({ pmid: 'arxiv:2301.12345' })).toBe('arxiv-retrieved');
    expect(inferArticleSourceClass({ pmid: 'doi:10.1234/x' })).toBe('user-imported');
    expect(inferArticleSourceClass({ pmid: 'pmcid:PMC1' })).toBe('user-imported');
    expect(inferArticleSourceClass({ pmid: '12345678' })).toBe('pubmed-retrieved');
    expect(inferArticleSourceClass({ pmid: '12345678', sourceClass: 'offline-placeholder' })).toBe(
      'offline-placeholder',
    );
  });

  it('stamps typed demo ids', () => {
    const stamped = stampDemoArticle({
      pmid: 'demo:x',
      title: 't',
      authors: '',
      journal: '',
      pubYear: '2020',
      summary: '',
      relevanceScore: 1,
      relevanceExplanation: '',
      keywords: [],
      isOpenAccess: false,
    });
    expect(stamped.sourceClass).toBe('demo-synthetic');
    expect(stamped.articleId).toEqual({ type: 'demo', value: 'x' });
  });

  it('resolves demo-only corpus class', () => {
    expect(resolveReportCorpusClass([{ pmid: 'demo:a', sourceClass: 'demo-synthetic' }])).toBe(
      'demo-only',
    );
    expect(corpusContainsDemo([{ pmid: '1' }, { pmid: 'demo:a' }])).toBe(true);
  });

  it('marks empty corpora as empty-retrieval', () => {
    expect(resolveReportCorpusClass([])).toBe('empty-retrieval');
  });
});
