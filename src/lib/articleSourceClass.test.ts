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
