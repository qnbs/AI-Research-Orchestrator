import { describe, it, expect } from 'vitest';
import { evaluateCase, runEvalSuite, type EvalCase } from './agentEval';

describe('agentEval', () => {
  const golden: EvalCase = {
    id: 'synthesis-grounded',
    description: 'Insights must cite corpus PMIDs',
    actual: {
      aiGeneratedInsights: [
        { question: 'Q?', answer: 'Supported.', supportingArticles: ['12345678'] },
      ],
      rankedArticles: [{ pmid: '12345678' }],
    },
    expect: {
      type: 'object',
      requiredKeys: ['aiGeneratedInsights', 'rankedArticles'],
      mustCitePmids: ['12345678'],
    },
  };

  it('passes a grounded synthesis fixture', () => {
    const result = evaluateCase(golden);
    expect(result.passed).toBe(true);
  });

  it('fails when citations are missing', () => {
    const result = evaluateCase({
      ...golden,
      id: 'missing-cite',
      actual: {
        aiGeneratedInsights: [{ question: 'Q?', answer: 'No ids.', supportingArticles: [] }],
        rankedArticles: [],
      },
    });
    expect(result.passed).toBe(false);
    expect(result.dimensions.find((d) => d.dimension === 'citationGrounding')?.passed).toBe(false);
  });

  it('handles undefined actual without throwing on citation checks', () => {
    const result = evaluateCase({
      id: 'undefined-actual',
      description: 'undefined model output',
      actual: undefined,
      expect: { mustCitePmids: ['12345678'] },
    });
    expect(result.passed).toBe(false);
    expect(result.dimensions.find((d) => d.dimension === 'citationGrounding')?.passed).toBe(false);
  });

  it('aggregates suite pass rate', () => {
    const { passRate, results } = runEvalSuite([
      golden,
      {
        id: 'bad-schema',
        description: 'array instead of object',
        actual: [],
        expect: { type: 'object', requiredKeys: ['synthesis'] },
      },
    ]);
    expect(results).toHaveLength(2);
    expect(passRate).toBe(0.5);
  });

  it('validates PubMed query structure', () => {
    const result = evaluateCase({
      id: 'query-ok',
      description: 'valid query',
      actual: '(aspirin[Title]) AND ("RCT"[Publication Type])',
      expect: { pubmedQuery: true },
    });
    expect(result.passed).toBe(true);
  });

  it('flags ranked articles outside corpus', () => {
    const result = evaluateCase({
      id: 'ranked-bad',
      description: 'hallucinated pmid',
      actual: { rankedArticles: [{ pmid: '999' }] },
      expect: { rankedCorpusPmids: ['1', '2'] },
    });
    expect(result.passed).toBe(false);
  });

  it('rejects invalid PubMed queries when pubmedQueryValid is false', () => {
    const result = evaluateCase({
      id: 'query-bad',
      description: 'malformed boolean',
      actual: 'cancer OR OR therapy',
      expect: { pubmedQuery: true, pubmedQueryValid: false },
    });
    expect(result.passed).toBe(true);
  });

  it('requires minimum grounded claims tied to corpus', () => {
    const result = evaluateCase({
      id: 'grounded-min',
      description: 'needs two valid claims',
      actual: {
        rankedArticles: [{ pmid: '1' }, { pmid: '2' }],
        groundedSynthesis: {
          mode: 'narrative-extracted',
          claims: [
            { text: 'One', pmids: ['1'] },
            { text: 'Two', pmids: ['88'] },
          ],
        },
      },
      expect: { minGroundedClaims: 2 },
    });
    expect(result.passed).toBe(false);
    expect(result.dimensions.find((d) => d.dimension === 'groundedSynthesis')?.passed).toBe(false);
  });
});
