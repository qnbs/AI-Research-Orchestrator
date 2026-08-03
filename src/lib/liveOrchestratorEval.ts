/**
 * Recorded orchestrator ranking fixtures for offline retrieval validation (P1-4 / PR9).
 */
import { applyCorpusCitationGrounding } from './citationGrounding';
import { evaluateCase, runEvalSuite, type EvalCase } from './agentEval';
import type { RankedArticle } from '../types';

const SAMPLE_CORPUS = ['1001', '1002', '1003'];

const SAMPLE_RANKING_RESPONSE = {
  rankedArticles: [
    {
      pmid: '1001',
      relevanceScore: 95,
      relevanceExplanation: 'Direct match',
      keywords: ['aspirin'],
      articleType: 'RCT',
      aiSummary: 'RCT of aspirin.',
    },
    {
      pmid: '9999',
      relevanceScore: 80,
      relevanceExplanation: 'Hallucinated PMID',
      keywords: ['aspirin'],
      articleType: 'Review',
      aiSummary: 'Should be filtered.',
    },
  ],
  aiGeneratedInsights: [
    {
      question: 'Efficacy?',
      answer: 'Benefit observed.',
      supportingArticles: ['1001', '8888'],
    },
  ],
  overallKeywords: [{ keyword: 'aspirin', frequency: 2 }],
};

function toRankedStub(
  pmid: string,
  opts: { title?: string; summary?: string; relevanceScore?: number } = {},
): RankedArticle {
  return {
    pmid,
    title: opts.title ?? `Title ${pmid}`,
    summary: opts.summary ?? `Abstract for ${pmid} aspirin cardiovascular outcomes.`,
    authors: 'A',
    journal: 'J',
    pubYear: '2020',
    relevanceScore: opts.relevanceScore ?? 50,
    relevanceExplanation: 'fixture',
    keywords: ['aspirin'],
    isOpenAccess: false,
  };
}

/**
 * Large corpus with the only highly relevant article at the end.
 * Proves grounding retains the tail PMID (not lost to truncation/order bias).
 */
function largeCorpusTailCase(): EvalCase {
  const fillerPmids = Array.from({ length: 48 }, (_, i) => String(3000 + i));
  const tailPmid = '9001';
  const corpus = [...fillerPmids, tailPmid];
  const ranked = [
    ...fillerPmids.map((pmid) =>
      toRankedStub(pmid, {
        title: `Filler ${pmid}`,
        summary: `Unrelated filler abstract ${pmid}.`,
        relevanceScore: 20,
      }),
    ),
    toRankedStub(tailPmid, {
      title: 'Aspirin cardiovascular prevention trial',
      summary: 'Aspirin reduced major cardiovascular events in high-risk adults.',
      relevanceScore: 99,
    }),
  ];
  const insights = [
    {
      question: 'Does aspirin reduce cardiovascular events?',
      answer: 'Aspirin reduced major cardiovascular events.',
      supportingArticles: [tailPmid],
    },
  ];
  const grounded = applyCorpusCitationGrounding(corpus, ranked, insights);

  return {
    id: 'orchestrator-tail-article-survives',
    description:
      'Relevant article at the end of a large corpus remains after corpus citation grounding',
    actual: {
      rankedArticles: grounded.rankedArticles,
      aiGeneratedInsights: grounded.insights,
    },
    expect: {
      type: 'object',
      rankedCorpusPmids: corpus,
      mustCitePmids: [tailPmid],
    },
  };
}

/** Claim-level precision / recall / relevance / unsupported-rate fixture. */
function claimTrustMetricsCase(): EvalCase {
  const corpusArticles = [
    toRankedStub('1001', {
      title: 'Aspirin cardiovascular trial',
      summary: 'Aspirin reduced major cardiovascular events in adults.',
    }),
    toRankedStub('1002', {
      title: 'Bleeding review',
      summary: 'Aspirin increased major bleeding risk in prevention.',
    }),
  ];
  return {
    id: 'orchestrator-claim-trust-metrics',
    description: 'Claim-level citation precision, recall, source relevance, unsupported rate',
    actual: {
      rankedArticles: corpusArticles,
      groundedSynthesis: {
        mode: 'extractive-template',
        claims: [
          {
            text: 'Aspirin reduced major cardiovascular events.',
            pmids: ['1001'],
            validationState: 'claim-supported',
          },
          {
            text: 'Aspirin increased major bleeding risk.',
            pmids: ['1002'],
            validationState: 'claim-supported',
          },
        ],
      },
    },
    expect: {
      type: 'object',
      maxUnsupportedClaimRate: 0,
      minCitationPrecision: 1,
      minCitationRecall: 1,
      maxIrrelevantCitationRate: 0,
      minSourceRelevance: 1,
      minGroundedClaims: 2,
      rankedCorpusPmids: ['1001', '1002'],
    },
  };
}

/** Golden cases for live orchestrator ranking + grounding pipeline. */
export function liveOrchestratorEvalFixtures(): EvalCase[] {
  const grounded = applyCorpusCitationGrounding(
    SAMPLE_CORPUS,
    SAMPLE_RANKING_RESPONSE.rankedArticles.map((r) => ({
      ...r,
      title: 'T',
      summary: 'S',
      authors: 'A',
      journal: 'J',
      pubYear: '2020',
      isOpenAccess: false,
    })),
    SAMPLE_RANKING_RESPONSE.aiGeneratedInsights,
  );

  return [
    {
      id: 'orchestrator-query-valid',
      description: 'AI-generated PubMed query passes structural validation',
      actual: '(aspirin[Title/Abstract]) AND ("Randomized Controlled Trial"[Publication Type])',
      expect: { pubmedQuery: true },
    },
    {
      id: 'orchestrator-ranked-corpus',
      description: 'Grounded ranking drops hallucinated PMIDs',
      actual: {
        rankedArticles: grounded.rankedArticles,
        aiGeneratedInsights: grounded.insights,
      },
      expect: {
        type: 'object',
        rankedCorpusPmids: SAMPLE_CORPUS,
        mustCitePmids: ['1001'],
      },
    },
    {
      id: 'orchestrator-invalid-query',
      description: 'Malformed boolean query fails validation',
      actual: 'cancer OR OR therapy',
      expect: { pubmedQuery: true, pubmedQueryValid: false },
    },
    largeCorpusTailCase(),
    claimTrustMetricsCase(),
  ];
}

/** Run live orchestrator eval fixtures; returns pass flag and per-case results. */
export function runLiveOrchestratorEvalHarness(): {
  passed: boolean;
  results: ReturnType<typeof evaluateCase>[];
} {
  const cases = liveOrchestratorEvalFixtures();
  const { results, passRate } = runEvalSuite(cases);
  return { passed: passRate === 1, results };
}

/** CI gate: all live orchestrator fixtures must pass (used by check:agent-eval). */
export function assertLiveOrchestratorEvalPasses(): void {
  const { passed, results } = runLiveOrchestratorEvalHarness();
  if (!passed) {
    const failed = results.filter((r) => !r.passed);
    throw new Error(`live-orchestrator-eval failed: ${failed.map((f) => f.id).join(', ')}`);
  }
}
