/**
 * Offline agent-eval fixtures for the heuristic inference layer (extends P1-4).
 */
import { evaluateCase, type EvalCase } from './agentEval';
import {
  buildDemoResearchReport,
  formulatePubMedQuery,
  rankArticles,
  DEMO_CORPUS,
} from '../services/heuristics';

/** Golden cases for heuristic outputs — run without network. */
export function heuristicEvalFixtures(): EvalCase[] {
  const report = buildDemoResearchReport('aspirin cardiovascular primary prevention');
  const query = formulatePubMedQuery({
    researchTopic: 'aspirin cardiovascular primary prevention',
    dateRange: '5',
    articleTypes: ['Systematic Review'],
    synthesisFocus: 'overview',
    maxArticlesToScan: 20,
    topNToSynthesize: 5,
  });
  const ranked = rankArticles(DEMO_CORPUS, 'aspirin cardiovascular', 5);

  return [
    {
      id: 'heuristic-query-shape',
      description: 'PubMed-style query string is non-empty',
      actual: query,
      expect: {
        type: 'object',
        requiredKeys: ['query', 'explanation'],
        minStringLength: 10,
        stringPath: 'query',
      },
    },
    {
      id: 'heuristic-ranked-schema',
      description: 'Ranked articles include scores and PMIDs',
      actual: { articles: ranked },
      expect: {
        type: 'object',
        requiredKeys: ['articles'],
        mustCitePmids: ranked.slice(0, 1).map((a) => a.pmid),
      },
    },
    {
      id: 'heuristic-report-synthesis',
      description: 'Demo report synthesis cites PMIDs and has structure',
      actual: report,
      expect: {
        type: 'object',
        requiredKeys: ['synthesis', 'rankedArticles', 'generatedQueries'],
        mustCitePmids: report.rankedArticles.slice(0, 1).map((a) => a.pmid),
        minStringLength: 100,
        stringPath: 'synthesis',
      },
    },
  ];
}

/** Run all heuristic offline eval fixtures; returns aggregate pass/fail. */
export function runHeuristicEvalHarness(): {
  passed: boolean;
  results: ReturnType<typeof evaluateCase>[];
} {
  const results = heuristicEvalFixtures().map(evaluateCase);
  return { passed: results.every((r) => r.passed), results };
}
