import { describe, it, expect } from 'vitest';
import { buildQuery, buildMultipleQueries, extractPhrases } from './queryBuilder';
import { findMeshTermsInQuery, MESH_DICTIONARY, formatMeshClause } from './meshDictionary';
import { validatePubMedQuery } from '../../lib/pubmedQueryValidator';
import { tokenize } from './utils';

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

  it('applies the PubMed free full text filter when openAccessOnly is set', () => {
    const query = buildQuery('diabetes', { openAccessOnly: true });
    expect(query.query).toContain('free full text[filter]');
    expect(query.explanation).toContain('Free full text filter');
  });

  it('never produces malformed boolean syntax for MeSH-heavy topics', () => {
    const query = buildQuery('aspirin cardiovascular disease prevention');
    const validation = validatePubMedQuery(query.query);
    expect(validation.valid).toBe(true);
    expect(query.query).not.toMatch(/\bOR\s+OR\b/i);
  });

  it('maps German lay topics to MeSH after dropping DE stopwords', () => {
    const tokens = tokenize('Behandlung von Bluthochdruck', 'all');
    expect(tokens).toContain('bluthochdruck');
    expect(tokens).not.toContain('von');

    const query = buildQuery('Behandlung von Bluthochdruck');
    expect(query.meshTerms).toContain('Hypertension');
    expect(query.query).toContain('Hypertension');
    expect(validatePubMedQuery(query.query).valid).toBe(true);
  });

  it('resolves multi-word MeSH keys via adjacent phrases', () => {
    const query = buildQuery('public health prevention');
    expect(query.meshTerms).toEqual(
      expect.arrayContaining(['Public Health', 'Primary Prevention']),
    );
    expect(validatePubMedQuery(query.query).valid).toBe(true);
  });

  it('maps Krebs and Immuntherapie to MeSH headings', () => {
    const query = buildQuery('Krebs Immuntherapie');
    expect(query.meshTerms).toEqual(expect.arrayContaining(['Neoplasms', 'Immunotherapy']));
    expect(validatePubMedQuery(query.query).valid).toBe(true);
  });

  it('maps Schlaganfall and Herzinfarkt to Stroke and Myocardial Infarction', () => {
    expect(buildQuery('Schlaganfall').meshTerms).toContain('Stroke');
    expect(buildQuery('Herzinfarkt').meshTerms).toContain('Myocardial Infarction');
  });
});

describe('MeSH dictionary query property', () => {
  it('every dictionary entry produces a non-empty MeSH clause', () => {
    for (const entry of Object.values(MESH_DICTIONARY)) {
      const clause = formatMeshClause(entry);
      expect(clause.length).toBeGreaterThan(0);
      expect(clause).toMatch(/\[MeSH Terms\]$/);
    }
  });

  it('every dictionary key builds a structurally valid query', () => {
    for (const key of Object.keys(MESH_DICTIONARY)) {
      const built = buildQuery(key);
      const validation = validatePubMedQuery(built.query);
      expect(validation.valid, `invalid query for key ${key}: ${validation.errors}`).toBe(true);
    }
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
