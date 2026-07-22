import { describe, it, expect } from 'vitest';
import { buildQuery, buildMultipleQueries, extractPhrases } from './queryBuilder';
import { findMeshTermsInQuery } from './meshDictionary';

describe('buildQuery', () => {
  it('builds a basic query with an explanation', () => {
    const query = buildQuery('diabetes treatment');
    expect(query.query).toContain('diabetes');
    expect(query.explanation).toBeTruthy();
  });

  it('applies date range and publication type filters', () => {
    const query = buildQuery('cancer', {
      minYear: 2020,
      maxYear: 2024,
      publicationTypes: ['Review'],
    });
    expect(query.query).toContain('Date - Publication');
    expect(query.query).toContain('Publication Type');
  });
});

describe('buildMultipleQueries', () => {
  it('builds multiple distinct queries for broader coverage', () => {
    const queries = buildMultipleQueries('cancer immunotherapy');
    expect(queries.length).toBeGreaterThan(0);
    expect(queries[0].query).toBeTruthy();
  });

  it('respects the count parameter', () => {
    const queries = buildMultipleQueries('cancer', 1);
    expect(queries).toHaveLength(1);
  });
});

describe('extractPhrases', () => {
  it('extracts quoted phrases verbatim', () => {
    const phrases = extractPhrases('research on "gene therapy" outcomes');
    expect(phrases).toContain('gene therapy');
  });

  it('extracts multi-word candidate phrases from unquoted text', () => {
    const phrases = extractPhrases('machine learning in cancer research');
    expect(phrases.length).toBeGreaterThan(0);
  });
});

describe('findMeshTermsInQuery (via queryBuilder integration)', () => {
  it('finds MeSH terms referenced in a built query', () => {
    const meshTerms = findMeshTermsInQuery('diabetes mellitus type 2');
    expect(Array.isArray(meshTerms)).toBe(true);
    expect(meshTerms.length).toBeGreaterThan(0);
  });
});
