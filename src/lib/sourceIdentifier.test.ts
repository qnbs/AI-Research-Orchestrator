import { describe, expect, it } from 'vitest';
import type { RankedArticle } from '../types';
import {
  canonicalArticleKey,
  corpusKeysFromArticles,
  ensureArticleIdentifiers,
  ensureGroundedClaim,
  formatLegacyArticleKeyLabel,
  formatSourceIdentifierValue,
  isArxivArticle,
  legacyArticleKeyUrl,
  parseLegacyArticleKey,
  articleExternalUrl,
  resolveArticleId,
  sourceIdentifierCopyLabelKey,
  sourceIdentifierExternalUrl,
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

  it('returns safe empty pmid for non-string keys', () => {
    expect(parseLegacyArticleKey(undefined)).toEqual({ type: 'pmid', value: '' });
    expect(parseLegacyArticleKey(42)).toEqual({ type: 'pmid', value: '' });
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

  it('uses primary identifier URL even when supplemental pmcId exists', () => {
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
    expect(articleExternalUrl(article)).toBe('https://pubmed.ncbi.nlm.nih.gov/12345/');
  });

  it('links pmcid-primary articles to PMC', () => {
    const article: RankedArticle = {
      pmid: 'pmcid:888',
      articleId: { type: 'pmcid', value: '888' },
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

  it('preserves slashes in doi.org URLs', () => {
    expect(sourceIdentifierExternalUrl({ type: 'doi', value: '10.1234/example' })).toBe(
      'https://doi.org/10.1234/example',
    );
  });
});

describe('ensureGroundedClaim', () => {
  it('derives articleIds from legacy pmids', () => {
    const claim = ensureGroundedClaim({
      text: 'Finding',
      pmids: ['12345', 'arxiv:2301.99999'],
    });
    expect(claim.articleIds).toEqual([
      { type: 'pmid', value: '12345' },
      { type: 'arxiv', value: '2301.99999' },
    ]);
    expect(claim.pmids).toEqual(['12345', 'arxiv:2301.99999']);
  });

  it('derives pmids from articleIds when pmids is empty', () => {
    const claim = ensureGroundedClaim({
      text: 'Finding',
      pmids: [],
      articleIds: [
        { type: 'doi', value: '10.1/xyz' },
        { type: 'pmcid', value: '999' },
      ],
    });
    expect(claim.pmids).toEqual(['doi:10.1/xyz', 'pmcid:999']);
    expect(claim.articleIds?.[0]).toEqual({ type: 'doi', value: '10.1/xyz' });
  });

  it('canonicalizes legacy pmcid keys with PMC prefix', () => {
    const claim = ensureGroundedClaim({
      text: 'Finding',
      pmids: ['pmcid:PMC555'],
    });
    expect(claim.pmids).toEqual(['pmcid:555']);
    expect(claim.articleIds).toEqual([{ type: 'pmcid', value: '555' }]);
  });

  it('falls back to pmids when articleIds are all malformed', () => {
    const claim = ensureGroundedClaim({
      text: 'Finding',
      pmids: ['12345'],
      articleIds: [{ type: 'bogus', value: 'x' } as unknown as import('../types').SourceIdentifier],
    });
    expect(claim.pmids).toEqual(['12345']);
    expect(claim.articleIds).toEqual([{ type: 'pmid', value: '12345' }]);
  });
});

describe('resolveArticleId validation', () => {
  it('falls back when persisted articleId is malformed', () => {
    const article: RankedArticle = {
      pmid: '12345',
      articleId: { type: 'bogus', value: 'x' } as unknown as RankedArticle['articleId'],
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
    expect(resolveArticleId(article)).toEqual({ type: 'pmid', value: '12345' });
    expect(ensureArticleIdentifiers(article).pmid).toBe('12345');
  });

  it('prefers canonical legacy pmid when articleId disagrees', () => {
    const article: RankedArticle = {
      pmid: '12345',
      articleId: { type: 'arxiv', value: '9' },
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
    expect(resolveArticleId(article).type).toBe('pmid');
    const hydrated = ensureArticleIdentifiers(article);
    expect(hydrated.articleId).toEqual({ type: 'pmid', value: '12345' });
    expect(hydrated.pmid).toBe('12345');
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
    expect(sourceIdentifierLabelKey({ type: 'doi', value: '10.1/x' })).toBe(
      'article.identifier.doi',
    );
    expect(sourceIdentifierLabelKey({ type: 'pmid', value: '99' })).toBe('article.identifier.pmid');
    expect(sourceIdentifierLabelKey({ type: 'pmcid', value: '123' })).toBe(
      'article.identifier.pmcid',
    );
    expect(
      sourceIdentifierLabelKey({
        type: 'bogus',
        value: 'x',
      } as unknown as import('../types').SourceIdentifier),
    ).toBe('article.identifier.pmid');
    expect(formatSourceIdentifierValue({ type: 'pmcid', value: '123' })).toBe('PMC123');
    expect(formatSourceIdentifierValue({ type: 'pmid', value: '42' })).toBe('42');
    expect(formatSourceIdentifierValue({ type: 'arxiv', value: '2301.1' })).toBe('2301.1');
    expect(formatSourceIdentifierValue({ type: 'doi', value: '10.1/x' })).toBe('10.1/x');
  });

  it('maps copy-to-clipboard label keys for every identifier type', () => {
    expect(sourceIdentifierCopyLabelKey({ type: 'pmid', value: '1' })).toBe('report.copyType.pmid');
    expect(sourceIdentifierCopyLabelKey({ type: 'arxiv', value: '1' })).toBe(
      'report.copyType.arxiv',
    );
    expect(sourceIdentifierCopyLabelKey({ type: 'doi', value: '1' })).toBe('report.copyType.doi');
    expect(sourceIdentifierCopyLabelKey({ type: 'pmcid', value: '1' })).toBe(
      'report.copyType.pmcid',
    );
    expect(
      sourceIdentifierCopyLabelKey({
        type: 'bogus',
        value: 'x',
      } as unknown as import('../types').SourceIdentifier),
    ).toBe('report.copyType.pmid');
  });

  it('builds external URLs for every identifier type', () => {
    expect(sourceIdentifierExternalUrl({ type: 'pmid', value: '12345' })).toBe(
      'https://pubmed.ncbi.nlm.nih.gov/12345/',
    );
    expect(sourceIdentifierExternalUrl({ type: 'arxiv', value: '2301.99999' })).toBe(
      'https://arxiv.org/abs/2301.99999',
    );
    expect(sourceIdentifierExternalUrl({ type: 'doi', value: '10.1234/example' })).toBe(
      'https://doi.org/10.1234/example',
    );
    expect(sourceIdentifierExternalUrl({ type: 'pmcid', value: '888' })).toBe(
      'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC888/',
    );
    expect(sourceIdentifierExternalUrl({ type: 'pmcid', value: 'PMC888' })).toBe(
      'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC888/',
    );
    expect(
      sourceIdentifierExternalUrl({
        type: 'bogus',
        value: 'x',
      } as unknown as import('../types').SourceIdentifier),
    ).toBe('https://pubmed.ncbi.nlm.nih.gov/x/');
  });

  it('formats legacy keys for exports and resolves legacy URLs', () => {
    expect(formatLegacyArticleKeyLabel('12345')).toBe('PMID: 12345');
    expect(formatLegacyArticleKeyLabel('arxiv:2301.1')).toBe('arXiv: 2301.1');
    expect(formatLegacyArticleKeyLabel('doi:10.1/x')).toBe('DOI: 10.1/x');
    expect(formatLegacyArticleKeyLabel('pmcid:PMC555')).toBe('PMCID: PMC555');
    expect(legacyArticleKeyUrl('12345')).toBe('https://pubmed.ncbi.nlm.nih.gov/12345/');
    expect(legacyArticleKeyUrl('arxiv:2301.1')).toBe('https://arxiv.org/abs/2301.1');
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
