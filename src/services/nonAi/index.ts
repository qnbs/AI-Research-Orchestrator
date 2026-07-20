/**
 * Non-AI Programmatic Research Engine public façade.
 * Provides the same interface as geminiService for seamless integration.
 */

import type { ResearchInput, ResearchReport } from '../../types';
import type { NonAiMode } from './types';
import { buildMultipleQueries } from './queryBuilder';
import { retrieveArticles } from './retriever';
import { rankArticles } from './ranker';
import { mergeAndCurate, enrichArticles } from './curator';
import { generateResearchReport } from './synthesizer';
import { AppError } from '../../lib/errors';

/** Badge string for heuristic mode outputs. */
export const HEURISTIC_BADGE = 'Heuristic mode';

/**
 * Execute a full Non-AI research pipeline.
 * Returns a complete ResearchReport with deterministic, extractive synthesis.
 */
export async function* generateNonAiResearchReportStream(
  input: ResearchInput,
  signal?: AbortSignal,
): AsyncGenerator<{
  report?: ResearchReport;
  phase: string;
}> {
  // Phase 1: Query building
  yield { phase: `${HEURISTIC_BADGE} · Phase 1: Building Boolean query with MeSH terms...` };
  if (signal?.aborted) {
    throw new AppError({
      code: 'STREAM_ABORTED',
      message: 'Aborted',
      retryable: false,
    });
  }

  const queries = buildMultipleQueries(input.researchTopic);
  const primaryQuery = queries[0];

  // Phase 2: Retrieval
  yield { phase: `${HEURISTIC_BADGE} · Phase 2: Retrieving articles from PubMed and arXiv...` };
  const retrieval = await retrieveArticles([primaryQuery], {
    maxPubmed: input.maxArticlesToScan,
    maxArxiv: input.includeArxiv ? 10 : 0,
    signal,
  });

  // Phase 3: Curation
  if (signal?.aborted) {
    throw new AppError({
      code: 'STREAM_ABORTED',
      message: 'Aborted',
      retryable: false,
    });
  }
  yield { phase: `${HEURISTIC_BADGE} · Phase 3: Curating and deduplicating results...` };
  const curated = enrichArticles(mergeAndCurate(retrieval.pubmedArticles, retrieval.arxivArticles));

  // Phase 4: Ranking
  if (signal?.aborted) {
    throw new AppError({
      code: 'STREAM_ABORTED',
      message: 'Aborted',
      retryable: false,
    });
  }
  yield { phase: `${HEURISTIC_BADGE} · Phase 4: Ranking with BM25/TF-IDF hybrid...` };
  const ranked = rankArticles(curated, input.researchTopic);

  // Phase 5: Synthesis
  if (signal?.aborted) {
    throw new AppError({
      code: 'STREAM_ABORTED',
      message: 'Aborted',
      retryable: false,
    });
  }
  yield { phase: `${HEURISTIC_BADGE} · Phase 5: Generating extractive synthesis...` };
  const report = generateResearchReport(ranked, input.researchTopic);

  // Phase 6: Finalize
  yield { phase: `${HEURISTIC_BADGE} · Phase 6: Finalizing report...`, report };
}

/**
 * Get the current Non-AI mode.
 */
export function getNonAiMode(): NonAiMode {
  return 'nonAi';
}

/**
 * Check if Non-AI mode is available (always true for client-side).
 */
export function isNonAiAvailable(): boolean {
  return true;
}

// Re-export types and utilities
export type {
  NonAiMode,
  BuiltQuery,
  RetrievalResult,
  RankingWeights,
  ScoringExplanation,
  ExtractiveSynthesis,
  NarrativeSection,
} from './types';

export { buildQuery, buildMultipleQueries, extractPhrases } from './queryBuilder';

export { retrieveArticles } from './retriever';

export { rankArticles, getTopArticles } from './ranker';

export { mergeAndCurate, enrichArticles } from './curator';

export {
  generateResearchReport,
  generateExtractiveTldr,
  generateNarrativeSections,
} from './synthesizer';

export { extractKeywordsFromArticle, aggregateKeywords, extractNgrams } from './keywordExtractor';

export { findSimilarArticles, findSimilarArticlesWithThreshold } from './similarFinder';

export { clusterAuthorArticles, getAuthorProfileSummary } from './authorClusterer';

export {
  analyzeJournalMetrics,
  generateJournalProfile,
  suggestJournalsForField,
} from './journalProfiler';

export { generateResearchAnalysis, findRelatedOnline, answerFromReport } from './chatResponder';
