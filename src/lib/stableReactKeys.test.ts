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
    const a = stableAuthorClusterKey(base);
    const b = stableAuthorClusterKey({ ...base, pmids: ['300', '400'] });
    expect(a).not.toBe(b);
  });

  it('is stable regardless of PMID order', () => {
    const a = stableAuthorClusterKey(base);
    const b = stableAuthorClusterKey({ ...base, pmids: ['200', '100'] });
    expect(a).toBe(b);
  });
});

describe('stableInsightKey', () => {
  it('differs for duplicate questions with different supporting articles', () => {
    const question = 'What is the effect?';
    const a = stableInsightKey({
      question,
      answer: 'Answer A.',
      supportingArticles: ['1'],
    });
    const b = stableInsightKey({
      question,
      answer: 'Answer B.',
      supportingArticles: ['2'],
    });
    expect(a).not.toBe(b);
  });

  it('differs for duplicate questions with different answers and same PMIDs', () => {
    const question = 'What is the effect?';
    const a = stableInsightKey({
      question,
      answer: 'Answer A.',
      supportingArticles: ['1'],
    });
    const b = stableInsightKey({
      question,
      answer: 'Answer B.',
      supportingArticles: ['1'],
    });
    expect(a).not.toBe(b);
  });
});
