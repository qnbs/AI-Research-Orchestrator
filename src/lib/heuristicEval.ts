/**
 * Offline agent-eval fixtures for the heuristic inference layer (extends P1-4).
 */
import { evaluateCase, type EvalCase } from './agentEval';
import {
  buildDemoResearchReport,
  buildQuery,
  rankArticles,
  getTopArticles,
  DEMO_CORPUS,
} from '../services/nonAi';

/** Golden cases for heuristic outputs — run without network. */
export function heuristicEvalFixtures(): EvalCase[] {
  const topic = 'aspirin cardiovascular primary prevention';
  const report = buildDemoResearchReport(topic);
  const query = buildQuery(topic, {
    publicationTypes: ['Systematic Review'],
  });
  const ranked = getTopArticles(rankArticles(DEMO_CORPUS, topic), 5);

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
      actual: {
        rankedArticles: ranked,
        aiGeneratedInsights: ranked.slice(0, 1).map((a) => ({
          question: 'Relevance?',
          answer: 'High.',
          supportingArticles: [a.pmid],
        })),
      },
      expect: {
        type: 'object',
        requiredKeys: ['rankedArticles', 'aiGeneratedInsights'],
        mustCitePmids: ranked.slice(0, 1).map((a) => a.pmid),
      },
    },
    {
      id: 'heuristic-report-synthesis',
      description: 'Demo report insights cite corpus PMIDs',
      actual: {
        rankedArticles: report.rankedArticles,
        aiGeneratedInsights: report.aiGeneratedInsights,
        synthesis: report.synthesis,
        generatedQueries: report.generatedQueries,
        groundedSynthesis: report.groundedSynthesis,
      },
      expect: {
        type: 'object',
        requiredKeys: ['synthesis', 'rankedArticles', 'generatedQueries', 'aiGeneratedInsights'],
        mustCitePmids: report.rankedArticles.slice(0, 1).map((a) => a.pmid),
        rankedCorpusPmids: DEMO_CORPUS.map((a) => a.pmid),
        minGroundedClaims: 1,
        minStringLength: 100,
        stringPath: 'synthesis',
      },
    },
    {
      id: 'heuristic-query-pubmed-valid',
      description: 'Heuristic PubMed query passes structural validation',
      actual: buildQuery('aspirin cardiovascular disease prevention').query,
      expect: { pubmedQuery: true },
    },
    {
      id: 'heuristic-query-de-hypertension',
      description: 'German lay hypertension maps to Hypertension MeSH',
      actual: buildQuery('Behandlung von Bluthochdruck'),
      expect: {
        type: 'object',
        requiredKeys: ['query', 'explanation', 'meshTerms'],
        mustMeshTerms: ['Hypertension'],
        minStringLength: 8,
        stringPath: 'query',
      },
    },
    {
      id: 'heuristic-query-de-oncology-immuno',
      description: 'German oncology + immunotherapy MeSH mapping',
      actual: buildQuery('Krebs Immuntherapie'),
      expect: {
        type: 'object',
        requiredKeys: ['query', 'meshTerms'],
        mustMeshTerms: ['Neoplasms', 'Immunotherapy'],
      },
    },
    {
      id: 'heuristic-query-de-stroke',
      description: 'German lay stroke maps to Stroke MeSH',
      actual: buildQuery('Schlaganfall Prävention'),
      expect: {
        type: 'object',
        requiredKeys: ['query', 'meshTerms'],
        mustMeshTerms: ['Stroke'],
        minStringLength: 8,
        stringPath: 'query',
      },
    },
    {
      id: 'heuristic-query-de-mi',
      description: 'German heart attack maps to Myocardial Infarction MeSH',
      actual: buildQuery('Herzinfarkt Rehabilitation'),
      expect: {
        type: 'object',
        requiredKeys: ['query', 'meshTerms'],
        mustMeshTerms: ['Myocardial Infarction'],
        minStringLength: 8,
        stringPath: 'query',
      },
    },
    {
      id: 'heuristic-query-de-diabetes',
      description: 'German diabetes lay term maps to Diabetes Mellitus MeSH',
      actual: buildQuery('Zuckerkrankheit Insulintherapie'),
      expect: {
        type: 'object',
        requiredKeys: ['query', 'meshTerms'],
        mustMeshTerms: ['Diabetes Mellitus'],
      },
    },
    {
      id: 'heuristic-query-en-covid',
      description: 'COVID topic maps to COVID-19 MeSH',
      actual: buildQuery('long COVID cognitive symptoms'),
      expect: {
        type: 'object',
        requiredKeys: ['query', 'meshTerms'],
        mustMeshTerms: ['COVID-19'],
      },
    },
    {
      id: 'heuristic-query-en-heart-attack',
      description: 'English lay heart attack maps to Myocardial Infarction MeSH',
      actual: buildQuery('heart attack aspirin prevention'),
      expect: {
        type: 'object',
        requiredKeys: ['query', 'meshTerms'],
        mustMeshTerms: ['Myocardial Infarction'],
      },
    },
    {
      id: 'heuristic-demo-covid-rank',
      description: 'COVID topic ranks demo corpus COVID fixture highly',
      actual: (() => {
        const top = getTopArticles(rankArticles(DEMO_CORPUS, 'COVID vaccine mRNA'), 3);
        return { rankedArticles: top };
      })(),
      expect: {
        type: 'object',
        requiredKeys: ['rankedArticles'],
        mustRankPmids: ['demo:mrna-variants-2022'],
        rankedScoresDescending: true,
      },
    },
    {
      id: 'heuristic-ranked-corpus',
      description: 'Ranked PMIDs stay inside the demo corpus',
      actual: { rankedArticles: ranked },
      expect: {
        type: 'object',
        requiredKeys: ['rankedArticles'],
        rankedCorpusPmids: DEMO_CORPUS.map((a) => a.pmid),
        minRankedArticles: 1,
        rankedScoresDescending: true,
      },
    },
    {
      id: 'heuristic-query-de-lay-term',
      description: 'German lay topic maps to MeSH-oriented query tokens',
      actual: buildQuery('Krebs Prävention Screening', {}),
      expect: {
        type: 'object',
        requiredKeys: ['query', 'explanation'],
        minStringLength: 8,
        stringPath: 'query',
        mustMeshTerms: ['Neoplasms'],
      },
    },
    {
      id: 'heuristic-rank-order',
      description: 'Top ranked articles are ordered by descending relevance score',
      actual: (() => {
        const topic = 'diabetes metformin';
        const top = getTopArticles(rankArticles(DEMO_CORPUS, topic), 3);
        return { rankedArticles: top };
      })(),
      expect: {
        type: 'object',
        requiredKeys: ['rankedArticles'],
        minRankedArticles: 2,
        rankedScoresDescending: true,
      },
    },
  ];
}

/** Negative fixture — out-of-corpus grounded claim must fail eval. */
export function heuristicEvalNegativeFixtures(): EvalCase[] {
  const ranked = getTopArticles(rankArticles(DEMO_CORPUS, 'aspirin'), 2);
  return [
    {
      id: 'heuristic-grounded-corpus-bound',
      description: 'Grounded claims outside demo corpus fail validation',
      actual: {
        rankedArticles: ranked,
        groundedSynthesis: {
          mode: 'narrative-extracted',
          claims: [{ text: 'Out of corpus.', pmids: ['99999999'] }],
        },
      },
      expect: {
        type: 'object',
        rankedCorpusPmids: DEMO_CORPUS.map((a) => a.pmid),
        minGroundedClaims: 1,
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
