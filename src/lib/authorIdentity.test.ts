import { describe, expect, it } from 'vitest';
import type { AuthorCluster, RankedArticle } from '../types';
import {
  buildAuthorMetricsFromCorpus,
  computePublicationsPerYear,
  intersectClustersWithCorpus,
  isSameAuthorIdentity,
  resolveAuthorshipPosition,
  sanitizeLegacyAuthorMetrics,
} from './authorIdentity';

describe('isSameAuthorIdentity', () => {
  it('matches full names and PubMed-style initials', () => {
    expect(isSameAuthorIdentity('Doudna J', 'Jennifer Doudna')).toBe(true);
    expect(isSameAuthorIdentity('J Doudna', 'Jennifer Doudna')).toBe(true);
  });

  it('rejects same surname different people', () => {
    expect(isSameAuthorIdentity('John Smith', 'Jane Smith')).toBe(false);
  });

  it('handles hyphenated surnames', () => {
    expect(isSameAuthorIdentity('Marie Curie', 'M Curie')).toBe(true);
  });
});

describe('resolveAuthorshipPosition', () => {
  it('detects first, last, and single-author papers', () => {
    expect(resolveAuthorshipPosition('Smith J, Doe A', 'Smith J')).toBe('first');
    expect(resolveAuthorshipPosition('Doe A, Smith J', 'Smith J')).toBe('last');
    expect(resolveAuthorshipPosition('Smith J', 'Smith J')).toBe('single');
  });
});

describe('computePublicationsPerYear', () => {
  it('counts publications per year without randomness', () => {
    const counts = computePublicationsPerYear([
      { pubYear: '2020' },
      { pubYear: '2020' },
      { pubYear: '2021' },
    ] as Partial<RankedArticle>[]);
    expect(counts).toEqual({ '2020': 2, '2021': 1 });
  });
});

describe('intersectClustersWithCorpus', () => {
  it('drops out-of-corpus PMIDs from model clusters', () => {
    const clusters: AuthorCluster[] = [
      {
        nameVariant: 'Test Author',
        primaryAffiliation: 'Lab',
        topCoAuthors: [],
        coreTopics: [],
        publicationCount: 3,
        pmids: ['1', '99', '2'],
      },
    ];
    const articles = [{ pmid: '1' }, { pmid: '2' }] as Partial<RankedArticle>[];
    const filtered = intersectClustersWithCorpus(clusters, articles);
    expect(filtered[0].pmids).toEqual(['1', '2']);
    expect(filtered[0].publicationCount).toBe(2);
  });
});

describe('buildAuthorMetricsFromCorpus', () => {
  it('never fabricates h-index or citations', () => {
    const metrics = buildAuthorMetricsFromCorpus(
      [{ pubYear: '2020', authors: 'Smith J, Doe A', pmid: '1' }],
      'Smith J',
      1,
    );
    expect(metrics.hIndex).toBeNull();
    expect(metrics.totalCitations).toBeNull();
    expect(metrics.publicationsPerYear).toEqual({ '2020': 1 });
    expect(metrics.publicationsAsFirstAuthor).toBe(1);
  });
});

describe('sanitizeLegacyAuthorMetrics', () => {
  it('removes legacy fabricated citation timelines', () => {
    const sanitized = sanitizeLegacyAuthorMetrics(
      {
        hIndex: 42,
        totalCitations: 999,
        publicationCount: 1,
        publicationsPerYear: {},
        citationsPerYear: { '2020': 100 },
        publicationsAsFirstAuthor: 0,
        publicationsAsLastAuthor: 0,
      },
      [{ pubYear: '2020', authors: 'Smith J', pmid: '1' }],
      'Smith J',
    );
    expect(sanitized.hIndex).toBeNull();
    expect(sanitized.totalCitations).toBeNull();
    expect(sanitized.citationsPerYear).toBeUndefined();
    expect(sanitized.publicationsPerYear).toEqual({ '2020': 1 });
  });
});
