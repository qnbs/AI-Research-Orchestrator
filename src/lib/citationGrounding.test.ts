import { describe, it, expect } from 'vitest';
import {
  applyCorpusCitationGrounding,
  partitionCorpusCitations,
  measureCitationGrounding,
} from './citationGrounding';

describe('partitionCorpusCitations', () => {
  const corpus = new Set(['1', '2']);

  it('separates valid and invalid PMIDs', () => {
    expect(partitionCorpusCitations(corpus, ['1', '99', '2', '1'])).toEqual({
      valid: ['1', '2'],
      invalid: ['99'],
    });
  });
});

describe('applyCorpusCitationGrounding', () => {
  const corpus = ['1', '2'];
  const ranked = [
    {
      pmid: '1',
      title: 'A',
      authors: '',
      journal: '',
      pubYear: '2020',
      summary: '',
      relevanceScore: 1,
      relevanceExplanation: '',
      keywords: [],
      isOpenAccess: false,
    },
    {
      pmid: '99',
      title: 'B',
      authors: '',
      journal: '',
      pubYear: '2020',
      summary: '',
      relevanceScore: 1,
      relevanceExplanation: '',
      keywords: [],
      isOpenAccess: false,
    },
  ];
  const insights = [
    { question: 'Q?', answer: 'A.', supportingArticles: ['1', '99'] },
    { question: 'Q2?', answer: 'B.', supportingArticles: ['88'] },
  ];

  it('drops hallucinated PMIDs from insights and ranked articles', () => {
    const result = applyCorpusCitationGrounding(corpus, ranked, insights);
    expect(result.rankedArticles.map((a) => a.pmid)).toEqual(['1']);
    expect(result.insights).toEqual([{ question: 'Q?', answer: 'A.', supportingArticles: ['1'] }]);
    expect(result.metrics.invalidCitations).toBe(2);
    expect(result.metrics.droppedRankedArticles).toBe(1);
    expect(result.fullyGrounded).toBe(false);
  });
});

describe('measureCitationGrounding', () => {
  it('reports zero validity when insights lack corpus citations', () => {
    const metrics = measureCitationGrounding(new Set(['1']), [
      { question: 'Q', answer: 'A', supportingArticles: ['9'] },
    ]);
    expect(metrics.citationValidity).toBe(0);
  });
});
