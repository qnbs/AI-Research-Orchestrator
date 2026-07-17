import { describe, it, expect } from 'vitest';
import { evaluateCase, runEvalSuite, type EvalCase } from './agentEval';

describe('agentEval', () => {
  const golden: EvalCase = {
    id: 'synthesis-grounded',
    description: 'Synthesis must cite PMIDs and include rankedArticles',
    actual: {
      synthesis: 'Findings support therapy [PMID:12345678].',
      rankedArticles: [{ pmid: '12345678' }],
    },
    expect: {
      type: 'object',
      requiredKeys: ['synthesis', 'rankedArticles'],
      mustCitePmids: ['12345678'],
      stringPath: 'synthesis',
      minStringLength: 10,
      maxStringLength: 5000,
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
      actual: { synthesis: 'No ids here.', rankedArticles: [] },
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
});
