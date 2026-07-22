/**
 * Non-AI Programmatic Research Engine public façade.
 * Provides the same interface as geminiService for seamless integration.
 *
 * Uses PubMed/arXiv when online; falls back to the curated demo corpus when
 * offline or when the live search returns nothing - ported from
 * `services/heuristics/researchStream.ts` during the nonAi/heuristics
 * consolidation (ADR 0009).
 */

import type { ResearchInput, ResearchReport } from '../../types';
import { HEURISTIC_BADGE } from './types';
import { buildQuery, type QueryBuildOptions } from './queryBuilder';
import { retrieveArticles } from './retriever';
import { rankArticles, getTopArticles } from './ranker';
import { mergeAndCurate, enrichArticles, type CuratedArticle } from './curator';
import { generateResearchReport, streamSynthesisChunks } from './synthesizer';
import { selectDemoArticlesForTopic } from './sampleData';
import { AppError } from '../../lib/errors';
import { throwIfAborted } from './utils';

export type NonAiStreamEvent = {
  report?: ResearchReport;
  synthesisChunk?: string;
  phase: string;
};

export type NonAiStreamOptions = {
  /**
   * Injectable online check for tests. Defaults to `navigator.onLine`
   * (true when `navigator` is unavailable). Avoids mutating shared globals.
   */
  getOnline?: () => boolean;
};

function phase(label: string): string {
  return `${HEURISTIC_BADGE} · ${label}`;
}

/** Maps the user's form filters (date range, article types) onto query-builder options. */
function queryOptionsFromInput(input: ResearchInput): QueryBuildOptions {
  const options: QueryBuildOptions = {};
  if (input.dateRange !== 'any') {
    options.minYear = new Date().getFullYear() - parseInt(input.dateRange, 10);
  }
  if (input.articleTypes.length > 0) {
    options.publicationTypes = input.articleTypes;
  }
  return options;
}

/**
 * Execute a full Non-AI research pipeline.
 * Returns a complete ResearchReport with deterministic, extractive synthesis.
 */
export async function* generateNonAiResearchReportStream(
  input: ResearchInput,
  signal?: AbortSignal,
  options: NonAiStreamOptions = {},
): AsyncGenerator<NonAiStreamEvent> {
  yield { phase: phase('Phase 1: Building Boolean query with MeSH terms...') };
  throwIfAborted(signal, 'Aborted');

  const primaryQuery = buildQuery(input.researchTopic, queryOptionsFromInput(input));

  const isOnline =
    options.getOnline?.() ?? (typeof navigator === 'undefined' ? true : navigator.onLine);

  let curated: CuratedArticle[] = [];

  if (isOnline) {
    yield { phase: phase('Phase 2: Retrieving articles from PubMed and arXiv...') };
    try {
      const retrieval = await retrieveArticles([primaryQuery], {
        maxPubmed: input.maxArticlesToScan,
        maxArxiv: input.includeArxiv ? 10 : 0,
        signal,
      });
      throwIfAborted(signal, 'Aborted');
      yield { phase: phase('Phase 3: Curating and deduplicating results...') };
      curated = enrichArticles(mergeAndCurate(retrieval.pubmedArticles, retrieval.arxivArticles));
    } catch (error) {
      if (error instanceof AppError && error.code === 'STREAM_ABORTED') throw error;
      yield { phase: phase('PubMed/arXiv unavailable — using local demo corpus...') };
    }
  } else {
    yield { phase: phase('Offline — loading curated demo corpus...') };
  }

  if (curated.length === 0) {
    yield { phase: phase('Selecting educational demo articles for topic...') };
    curated = enrichArticles(
      selectDemoArticlesForTopic(input.researchTopic, Math.min(input.maxArticlesToScan, 12), input),
    );
  }

  throwIfAborted(signal, 'Aborted');
  yield { phase: phase('Phase 4: Ranking with BM25/TF-IDF hybrid...') };
  const ranked = rankArticles(curated, input.researchTopic);
  const topRanked = getTopArticles(ranked, input.topNToSynthesize);

  throwIfAborted(signal, 'Aborted');
  yield { phase: phase('Phase 5: Generating extractive synthesis...') };
  const report: ResearchReport = {
    ...generateResearchReport(topRanked, input.researchTopic),
    generatedQueries: [{ query: primaryQuery.query, explanation: primaryQuery.explanation }],
  };
  yield { report, phase: phase('Phase 5: Generating extractive synthesis...') };

  for await (const chunk of streamSynthesisChunks(report.synthesis, signal)) {
    yield { synthesisChunk: chunk, phase: phase('Streaming synthesis...') };
  }

  yield { phase: phase('Phase 6: Finalizing report...') };
}

/**
 * Check if the Non-AI engine is available (always true - client-side, no API key needed).
 * Wired into the "Heuristic (local)" row of the AI-provider Settings UI.
 */
export function isNonAiAvailable(): boolean {
  return true;
}

// Re-export types and utilities
export type {
  BuiltQuery,
  RetrievalResult,
  RankingWeights,
  ScoringExplanation,
  ExtractiveSynthesis,
  NarrativeSection,
  ReportChatSession,
} from './types';
export { HEURISTIC_BADGE } from './types';

export { buildQuery, buildMultipleQueries, extractPhrases } from './queryBuilder';

export { retrieveArticles } from './retriever';

export { rankArticles, getTopArticles } from './ranker';

export {
  mergeAndCurate,
  enrichArticles,
  deduplicateArticles,
  cleanArticleMetadata,
  cleanArticles,
  classifyArticleType,
  type CuratedArticle,
} from './curator';

export {
  generateResearchReport,
  generateExtractiveTldr,
  generateNarrativeSections,
  generateHeuristicTldr,
  extractKeySentences,
  streamSynthesisChunks,
} from './synthesizer';

export {
  extractKeywordsFromArticle,
  extractKeywordsFromText,
  aggregateKeywords,
  extractNgrams,
} from './keywordExtractor';

export { findSimilarArticlesHeuristic } from './similarFinder';

export {
  disambiguateAuthorHeuristic,
  generateAuthorProfileHeuristic,
  suggestAuthorsHeuristic,
  getAuthorProfileSummary,
} from './authorClusterer';

export {
  analyzeJournalMetrics,
  generateJournalProfileHeuristic,
  suggestJournalsHeuristic,
  disambiguateJournalHeuristic,
  analyzeArticleHeuristic,
} from './journalProfiler';

export {
  generateResearchAnalysisHeuristic,
  findRelatedOnlineHeuristic,
  answerFromReport,
  createHeuristicChatSession,
} from './chatResponder';

export {
  DEMO_CORPUS,
  DEMO_ENTRY_PREFIX,
  DEMO_DISMISS_STORAGE_KEY,
  DEMO_SEEDED_STORAGE_KEY,
  selectDemoArticlesForTopic,
  buildDemoResearchReport,
  createDemoKnowledgeBaseEntries,
  isDemoPmid,
  isDemoEntryId,
  resolveHeuristicArticleByPmid,
} from './sampleData';
