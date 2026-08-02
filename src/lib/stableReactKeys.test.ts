import { describe, expect, it } from 'vitest';
import { stableAuthorClusterKey, stableInsightKey } from './stableReactKeys';

describe('stableAuthorClusterKey', () => {
  const base = {
    nameVariant: 'Smith J',
    primaryAffiliation: 'MIT',
    topCoAuthors: [],
    coreTopics: ['oncology'],
    publicationCount: 5,
    pmids: ['100', '200'],
  };

  it('differs when PMIDs differ but display fields match', () => {
    const firstKey = stableAuthorClusterKey(base);
    const secondKey = stableAuthorClusterKey({ ...base, pmids: ['300', '400'] });
    expect(firstKey).not.toBe(secondKey);
  });

  it('is stable regardless of PMID order', () => {
    const firstKey = stableAuthorClusterKey(base);
    const secondKey = stableAuthorClusterKey({ ...base, pmids: ['200', '100'] });
    expect(firstKey).toBe(secondKey);
  });

  it('does not collide when affiliation contains pipe characters', () => {
    const pipeAffiliation = stableAuthorClusterKey({
      ...base,
      nameVariant: 'A|B',
      primaryAffiliation: 'C',
      pmids: ['1'],
    });
    const splitAffiliation = stableAuthorClusterKey({
      ...base,
      nameVariant: 'A',
      primaryAffiliation: 'B|C',
      pmids: ['1'],
    });
    expect(pipeAffiliation).not.toBe(splitAffiliation);
  });
});

describe('stableInsightKey', () => {
  it('differs for duplicate questions with different supporting articles', () => {
    const question = 'What is the effect?';
    const firstKey = stableInsightKey({
      question,
      answer: 'Answer A.',
      supportingArticles: ['1'],
    });
    const secondKey = stableInsightKey({
      question,
      answer: 'Answer B.',
      supportingArticles: ['2'],
    });
    expect(firstKey).not.toBe(secondKey);
  });

  it('differs for duplicate questions with different answers and same PMIDs', () => {
    const question = 'What is the effect?';
    const firstKey = stableInsightKey({
      question,
      answer: 'Answer A.',
      supportingArticles: ['1'],
    });
    const secondKey = stableInsightKey({
      question,
      answer: 'Answer B.',
      supportingArticles: ['1'],
    });
    expect(firstKey).not.toBe(secondKey);
  });
});
