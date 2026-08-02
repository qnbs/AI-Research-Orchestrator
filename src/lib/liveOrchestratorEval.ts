/**
 * Recorded orchestrator ranking fixtures for offline retrieval validation (P1-4).
 */
import { applyCorpusCitationGrounding } from './citationGrounding';
import { evaluateCase, runEvalSuite, type EvalCase } from './agentEval';

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
