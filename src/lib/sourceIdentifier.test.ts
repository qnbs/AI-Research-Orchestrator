import { describe, expect, it } from 'vitest';
import type { RankedArticle } from '../types';
import {
  canonicalArticleKey,
  corpusKeysFromArticles,
  ensureArticleIdentifiers,
  formatSourceIdentifierValue,
  isArxivArticle,
  parseLegacyArticleKey,
  articleExternalUrl,
  resolveArticleId,
  sourceIdentifierLabelKey,
} from './sourceIdentifier';

describe('parseLegacyArticleKey', () => {
  it('parses pmid, arxiv, doi, and pmcid prefixes', () => {
    expect(parseLegacyArticleKey('12345')).toEqual({ type: 'pmid', value: '12345' });
    expect(parseLegacyArticleKey('arxiv:2301.99999')).toEqual({
      type: 'arxiv',
      value: '2301.99999',
    });
    expect(parseLegacyArticleKey('doi:10.1234/example')).toEqual({
      type: 'doi',
      value: '10.1234/example',
    });
    expect(parseLegacyArticleKey('pmcid:PMC1234567')).toEqual({
      type: 'pmcid',
      value: '1234567',
    });
  });
});

describe('canonicalArticleKey', () => {
  it('round-trips legacy keys', () => {
    const arxiv = { type: 'arxiv' as const, value: '2301.99999' };
    expect(canonicalArticleKey(arxiv)).toBe('arxiv:2301.99999');
    expect(parseLegacyArticleKey(canonicalArticleKey(arxiv))).toEqual(arxiv);
  });
});

describe('ensureArticleIdentifiers', () => {
  it('hydrates arxiv articles from legacy pmid', () => {
    const article: RankedArticle = {
      pmid: 'arxiv:2301.99999',
      title: 't',
      authors: 'a',
      journal: 'j',
      pubYear: '2024',
      summary: 's',
      relevanceScore: 1,
      relevanceExplanation: '',
      keywords: [],
      isOpenAccess: true,
    };
    const hydrated = ensureArticleIdentifiers(article);
    expect(hydrated.articleId).toEqual({ type: 'arxiv', value: '2301.99999' });
    expect(hydrated.pmid).toBe('arxiv:2301.99999');
  });

  it('hydrates pubmed articles with doi and pmcid', () => {
    const article: RankedArticle = {
      pmid: '12345',
      pmcId: 'PMC999',
      doi: '10.1/xyz',
      title: 't',
      authors: 'a',
      journal: 'j',
      pubYear: '2024',
      summary: 's',
      relevanceScore: 1,
      relevanceExplanation: '',
      keywords: [],
      isOpenAccess: true,
    };
    const hydrated = ensureArticleIdentifiers(article);
    expect(hydrated.articleId?.type).toBe('pmid');
    expect(hydrated.pmid).toBe('12345');
    expect(hydrated.pmcId).toBe('PMC999');
  });
});

describe('articleExternalUrl', () => {
  it('links arxiv and pubmed correctly', () => {
    const arxiv: RankedArticle = {
      pmid: 'arxiv:2301.99999',
      title: 't',
      authors: 'a',
      journal: 'j',
      pubYear: '2024',
      summary: 's',
      relevanceScore: 1,
      relevanceExplanation: '',
      keywords: [],
      isOpenAccess: true,
    };
    expect(articleExternalUrl(arxiv)).toBe('https://arxiv.org/abs/2301.99999');

    const pubmed: RankedArticle = {
      ...arxiv,
      pmid: '12345',
      articleId: { type: 'pmid', value: '12345' },
    };
    expect(articleExternalUrl(pubmed)).toBe('https://pubmed.ncbi.nlm.nih.gov/12345/');
  });

  it('prefers PMC URL when pmcId is present', () => {
    const article: RankedArticle = {
      pmid: '12345',
      pmcId: 'PMC888',
      title: 't',
      authors: 'a',
      journal: 'j',
      pubYear: '2024',
      summary: 's',
      relevanceScore: 1,
      relevanceExplanation: '',
      keywords: [],
      isOpenAccess: true,
    };
    expect(articleExternalUrl(article)).toContain('/pmc/articles/PMC888/');
  });
});

describe('corpusKeysFromArticles', () => {
  it('collects canonical keys for mixed corpus', () => {
    const keys = corpusKeysFromArticles([
      {
        pmid: '1',
        title: '',
        authors: '',
        journal: '',
        pubYear: '',
        summary: '',
        relevanceScore: 0,
        relevanceExplanation: '',
        keywords: [],
        isOpenAccess: false,
      },
      {
        pmid: 'arxiv:9',
        title: '',
        authors: '',
        journal: '',
        pubYear: '',
        summary: '',
        relevanceScore: 0,
        relevanceExplanation: '',
        keywords: [],
        isOpenAccess: true,
      },
    ]);
    expect(keys).toEqual(new Set(['1', 'arxiv:9']));
  });
});

describe('labels', () => {
  it('maps identifier types to i18n keys', () => {
    expect(sourceIdentifierLabelKey({ type: 'arxiv', value: '1' })).toBe(
      'article.identifier.arxiv',
    );
    expect(formatSourceIdentifierValue({ type: 'pmcid', value: '123' })).toBe('PMC123');
  });

  it('detects arxiv articles', () => {
    expect(
      isArxivArticle({
        pmid: 'arxiv:1',
        title: '',
        authors: '',
        journal: '',
        pubYear: '',
        summary: '',
        relevanceScore: 0,
        relevanceExplanation: '',
        keywords: [],
        isOpenAccess: true,
      }),
    ).toBe(true);
    expect(
      resolveArticleId({
        pmid: '2',
        title: '',
        authors: '',
        journal: '',
        pubYear: '',
        summary: '',
        relevanceScore: 0,
        relevanceExplanation: '',
        keywords: [],
        isOpenAccess: false,
      }).type,
    ).toBe('pmid');
  });
});
