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

  it('flags ranked articles with missing or empty pmid', () => {
    const result = evaluateCase({
      id: 'ranked-empty-pmid',
      description: 'empty pmid in ranked list',
      actual: { rankedArticles: [{ pmid: '' }, { pmid: '1' }] },
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

  it('fails pubmedQuery check when actual is not a string', () => {
    const result = evaluateCase({
      id: 'query-not-string',
      description: 'object instead of query',
      actual: { query: 'aspirin' },
      expect: { pubmedQuery: true },
    });
    expect(result.passed).toBe(false);
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

  it('rejects grounded claims with non-array pmids', () => {
    const result = evaluateCase({
      id: 'grounded-bad-pmids',
      description: 'malformed claim pmids',
      actual: {
        rankedArticles: [{ pmid: '1' }],
        groundedSynthesis: {
          mode: 'narrative-extracted',
          claims: [{ text: 'Bad', pmids: '1' as unknown as string[] }],
        },
      },
      expect: { minGroundedClaims: 1 },
    });
    expect(result.passed).toBe(false);
  });

  it('enforces claim-level precision, recall, and source relevance thresholds', () => {
    const result = evaluateCase({
      id: 'claim-metrics-ok',
      description: 'supported claims meet metric floors',
      actual: {
        rankedArticles: [
          {
            pmid: '1',
            title: 'Aspirin cardiovascular trial',
            summary: 'Aspirin reduced major cardiovascular events.',
          },
        ],
        groundedSynthesis: {
          mode: 'extractive-template',
          claims: [
            {
              text: 'Aspirin reduced major cardiovascular events.',
              pmids: ['1'],
              validationState: 'claim-supported',
            },
          ],
        },
      },
      expect: {
        maxUnsupportedClaimRate: 0,
        minCitationPrecision: 1,
        minCitationRecall: 1,
        maxIrrelevantCitationRate: 0,
        minSourceRelevance: 1,
      },
    });
    expect(result.passed).toBe(true);
  });

  it('fails when citation recall drops below the floor', () => {
    const result = evaluateCase({
      id: 'claim-metrics-low-recall',
      description: 'unsupported claim tanks recall',
      actual: {
        rankedArticles: [
          {
            pmid: '1',
            title: 'Aspirin cardiovascular trial',
            summary: 'Aspirin reduced major cardiovascular events.',
          },
        ],
        groundedSynthesis: {
          mode: 'narrative-extracted',
          claims: [
            {
              text: 'Aspirin reduced major cardiovascular events.',
              pmids: ['1'],
              validationState: 'claim-supported',
            },
            {
              text: 'Completely unrelated quantum claim.',
              pmids: ['1'],
              validationState: 'unverified',
            },
          ],
        },
      },
      expect: { minCitationRecall: 1, maxUnsupportedClaimRate: 0 },
    });
    expect(result.passed).toBe(false);
    expect(result.dimensions.find((d) => d.dimension === 'groundedSynthesis')?.passed).toBe(false);
  });

  it('fails claim metric floors when groundedSynthesis claims are empty', () => {
    const result = evaluateCase({
      id: 'empty-claims-metrics',
      description: 'vacuous perfect metrics must not pass floors',
      actual: {
        rankedArticles: [{ pmid: '1', title: 'T', summary: 'S' }],
        groundedSynthesis: { mode: 'extractive-template', claims: [] },
      },
      expect: {
        maxUnsupportedClaimRate: 0,
        minCitationPrecision: 1,
        minCitationRecall: 1,
        minSourceRelevance: 1,
      },
    });
    expect(result.passed).toBe(false);
    expect(result.dimensions.find((d) => d.dimension === 'groundedSynthesis')?.detail).toMatch(
      /no claims evaluated/,
    );
  });

  it('fails claim metric floors when groundedSynthesis is absent', () => {
    const result = evaluateCase({
      id: 'absent-grounded-synthesis',
      description: 'missing groundedSynthesis must not pass floors',
      actual: { rankedArticles: [{ pmid: '1' }] },
      expect: { minCitationRecall: 1, maxUnsupportedClaimRate: 0 },
    });
    expect(result.passed).toBe(false);
  });

  it('requires mustRankPmids in rankedArticles', () => {
    const result = evaluateCase({
      id: 'must-rank-missing',
      description: 'tail pmid dropped from ranked list',
      actual: { rankedArticles: [{ pmid: '1' }] },
      expect: { mustRankPmids: ['9001'], minRankedArticles: 1 },
    });
    expect(result.passed).toBe(false);
    expect(result.dimensions.find((d) => d.dimension === 'rankedCorpus')?.detail).toMatch(
      /missing ranked PMIDs: 9001/,
    );
  });
});
