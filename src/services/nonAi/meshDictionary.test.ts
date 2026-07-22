import { describe, it, expect } from 'vitest';
import {
  getMeshEntry,
  findMeshTermsInQuery,
  getMeshSynonyms,
  meshFieldTag,
} from './meshDictionary';

describe('getMeshEntry', () => {
  it('resolves a direct key match', () => {
    expect(getMeshEntry('cancer')?.heading).toBe('Neoplasms');
  });

  it('resolves a synonym match', () => {
    expect(getMeshEntry('t2d')?.heading).toBe('Diabetes Mellitus');
  });

  it('returns undefined for an unknown term', () => {
    expect(getMeshEntry('underwater basket weaving')).toBeUndefined();
  });

  // Regression coverage for the 13 terms merged in from
  // services/heuristics/queryFormulation.ts during the nonAi/heuristics
  // consolidation (ADR 0009) - these had no entry in this dictionary before.
  it.each([
    ['aspirin', 'Aspirin'],
    ['vaccine', 'Vaccines'],
    ['antibiotic', 'Anti-Bacterial Agents'],
    ['asthma', 'Asthma'],
    ['obesity', 'Obesity'],
    ['inflammation', 'Inflammation'],
    ['immunity', 'Immune System'],
    ['heart', 'Heart'],
    ['myocardial infarction', 'Myocardial Infarction'],
    ['parkinson disease', 'Parkinson Disease'],
    ['epilepsy', 'Epilepsy'],
    ['microbiome', 'Microbiota'],
    ['crispr', 'CRISPR-Cas Systems'],
  ])('resolves the merged term "%s" to heading "%s"', (term, heading) => {
    expect(getMeshEntry(term)?.heading).toBe(heading);
  });

  it('resolves the merged terms via their synonyms too', () => {
    expect(getMeshEntry('heart attack')?.heading).toBe('Myocardial Infarction');
    expect(getMeshEntry('gene editing')?.heading).toBe('CRISPR-Cas Systems');
    expect(getMeshEntry('seizure')?.heading).toBe('Epilepsy');
  });
});

describe('findMeshTermsInQuery', () => {
  it('finds multiple MeSH headings referenced in a query', () => {
    const terms = findMeshTermsInQuery('aspirin and cancer treatment with vaccine adjuvants');
    expect(terms).toContain('Aspirin');
    expect(terms).toContain('Neoplasms');
    expect(terms).toContain('Vaccines');
  });

  it('deduplicates repeated headings', () => {
    const terms = findMeshTermsInQuery('cancer cancer cancer');
    expect(terms.filter((t) => t === 'Neoplasms')).toHaveLength(1);
  });

  it('returns an empty array when nothing matches', () => {
    expect(findMeshTermsInQuery('xyzzy plugh')).toEqual([]);
  });
});

describe('getMeshSynonyms', () => {
  it('returns synonyms for a known heading key', () => {
    expect(getMeshSynonyms('aspirin')).toContain('acetylsalicylic acid');
  });

  it('returns an empty array for an unknown heading', () => {
    expect(getMeshSynonyms('not a real heading')).toEqual([]);
  });
});

describe('meshFieldTag', () => {
  it('builds a MeSH Terms field tag for a known heading', () => {
    expect(meshFieldTag('aspirin')).toBe('"Aspirin"[MeSH Terms]');
  });

  it('returns an empty string for an unknown heading', () => {
    expect(meshFieldTag('not a real heading')).toBe('');
  });
});
