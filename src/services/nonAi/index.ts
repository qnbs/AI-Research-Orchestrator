/**
 * Non-AI Programmatic Research Engine public façade.
 * Provides the same interface as geminiService for seamless integration.
 *
 * Uses PubMed/arXiv when online. Empty results and retrieval failures stay empty
 * unless the user explicitly opts into educational demo mode (P0 quarantine;
 * supersedes the silent demo fallback documented in ADR 0007 / 0009).
 */

import type { ResearchInput, ResearchReport, ReportCorpusClass } from '../../types';
import {
  makePipelineEvent,
  type PipelinePhaseId,
  type ResearchStreamEvent,
} from '../../types/pipelineEvents';
import { HEURISTIC_BADGE } from './types';
import { buildQuery, type QueryBuildOptions } from './queryBuilder';
import { retrieveArticles } from './retriever';
import { rankArticles, getTopArticles } from './ranker';
import { mergeAndCurate, enrichArticles, type CuratedArticle } from './curator';
import { generateResearchReport, streamSynthesisChunks } from './synthesizer';
import { selectDemoArticlesForTopic } from './sampleData';
import { AppError } from '../../lib/errors';
import { throwIfAborted } from './utils';
import { safeLogWarn } from '../../lib/safeLog';
import {
  inferArticleSourceClass,
  resolveReportCorpusClass,
  stampDemoArticle,
} from '../../lib/articleSourceClass';

/** Non-AI stream events share the typed ResearchStreamEvent contract (ADR 0020). */
export type NonAiStreamEvent = ResearchStreamEvent;

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

function emit(
  phaseId: PipelinePhaseId,
  label: string,
  extras: Omit<Parameters<typeof makePipelineEvent>[1], 'phase'> = {},
): NonAiStreamEvent {
  return makePipelineEvent(phaseId, { ...extras, phase: phase(label) });
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

function stampRetrievedArticles(articles: CuratedArticle[]): CuratedArticle[] {
  return articles.map((a) => ({
    ...a,
    sourceClass: a.sourceClass ?? inferArticleSourceClass(a),
  }));
}

function buildEmptyRetrievalReport(
  topic: string,
  primaryQuery: { query: string; explanation: string },
  outcome: NonNullable<ResearchReport['retrievalOutcome']>,
  message: string,
): ResearchReport {
  const corpusClass: ReportCorpusClass = 'empty-retrieval';
  return {
    generatedQueries: [{ query: primaryQuery.query, explanation: primaryQuery.explanation }],
    rankedArticles: [],
    synthesis: message,
    aiGeneratedInsights: [],
    overallKeywords: [],
    groundedSynthesis: undefined,
    corpusClass,
    retrievalOutcome: outcome,
  };
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
  yield emit('query-generation', 'Phase 1: Building Boolean query with MeSH terms...');
  throwIfAborted(signal, 'Aborted');

  const primaryQuery = buildQuery(input.researchTopic, queryOptionsFromInput(input));
  const educationalDemo = Boolean(input.educationalDemoMode);

  const isOnline =
    options.getOnline?.() ?? (typeof navigator === 'undefined' ? true : navigator.onLine);

  // Explicit educational demo — never implied by offline/empty/failure.
  if (educationalDemo) {
    yield emit('demo-corpus', 'Educational demo mode — loading synthetic demo corpus...');
    const curated = enrichArticles(
      selectDemoArticlesForTopic(
        input.researchTopic,
        Math.min(input.maxArticlesToScan, 12),
        input,
      ).map(stampDemoArticle),
    );
    throwIfAborted(signal, 'Aborted');
    yield emit('ranking', 'Phase 4: Ranking with BM25/TF-IDF hybrid...');
    const ranked = rankArticles(curated, input.researchTopic);
    const topRanked = getTopArticles(ranked, input.topNToSynthesize).map(stampDemoArticle);

    throwIfAborted(signal, 'Aborted');
    yield emit('synthesis', 'Phase 5: Generating extractive synthesis...');
    const report: ResearchReport = {
      ...generateResearchReport(topRanked, input.researchTopic),
      generatedQueries: [{ query: primaryQuery.query, explanation: primaryQuery.explanation }],
      corpusClass: 'demo-only',
      retrievalOutcome: 'educational_demo',
    };
    yield emit('synthesis', 'Phase 5: Generating extractive synthesis...', { report });

    for await (const chunk of streamSynthesisChunks(report.synthesis, signal)) {
      yield emit('synthesis-stream', 'Streaming synthesis...', { synthesisChunk: chunk });
    }

    yield emit('finalizing', 'Phase 6: Finalizing report...');
    return;
  }

  let curated: CuratedArticle[] = [];
  let retrievalFailed = false;
  let retrievalErrorCount = 0;

  if (isOnline) {
    yield emit('retrieval', 'Phase 2: Retrieving articles from PubMed and arXiv...');
    try {
      const retrieval = await retrieveArticles([primaryQuery], {
        maxPubmed: input.maxArticlesToScan,
        maxArxiv: input.includeArxiv ? 10 : 0,
        signal,
      });
      throwIfAborted(signal, 'Aborted');
      retrievalErrorCount = retrieval.retrievalErrorCount ?? 0;
      yield emit('curation', 'Phase 3: Curating and deduplicating results...');
      curated = stampRetrievedArticles(
        enrichArticles(mergeAndCurate(retrieval.pubmedArticles, retrieval.arxivArticles)),
      );
      if (curated.length === 0 && retrievalErrorCount > 0) {
        retrievalFailed = true;
        yield emit(
          'retrieval-status',
          'PubMed/arXiv unavailable — empty result (enable Educational Demo to practice offline).',
        );
      } else if (curated.length > 0 && retrievalErrorCount > 0) {
        yield emit(
          'retrieval-status',
          'Partial retrieval — one or more literature providers failed; synthesizing from available results.',
        );
      }
    } catch (error) {
      if (error instanceof AppError && error.code === 'STREAM_ABORTED') throw error;
      safeLogWarn('Non-AI retrieval failed; not substituting demo corpus:', error);
      retrievalFailed = true;
      retrievalErrorCount += 1;
      yield emit(
        'retrieval-status',
        'PubMed/arXiv unavailable — empty result (enable Educational Demo to practice offline).',
      );
    }
  } else {
    yield emit(
      'retrieval-status',
      'Offline — empty result (enable Educational Demo for synthetic practice corpus).',
    );
  }

  if (curated.length === 0) {
    const outcome = retrievalFailed
      ? 'retrieval_failed'
      : isOnline
        ? 'zero_results'
        : 'offline_without_demo';
    const message =
      outcome === 'retrieval_failed'
        ? `Retrieval failed for "${input.researchTopic}". No synthetic demo articles were substituted. ` +
          `Retry when PubMed/arXiv are available, or enable Educational Demo mode for synthetic practice fixtures.`
        : outcome === 'offline_without_demo'
          ? `Browser is offline. No retrieved literature is available for "${input.researchTopic}". ` +
            `Enable Educational Demo mode for synthetic practice fixtures, or reconnect to run a live search.`
          : `No PubMed/arXiv articles matched "${input.researchTopic}" with the current filters. ` +
            `This is a genuine zero-result retrieval — not a demo corpus. Broaden the query or enable Educational Demo mode.`;

    const emptyReport = buildEmptyRetrievalReport(
      input.researchTopic,
      primaryQuery,
      outcome,
      message,
    );
    yield emit('empty-retrieval', 'Empty retrieval — no scientific corpus assembled.', {
      report: emptyReport,
      // Emit as a chunk so orchestrator session accumulation keeps the explanation.
      synthesisChunk: emptyReport.synthesis,
    });
    yield emit('finalizing', 'Phase 6: Finalizing report...');
    return;
  }

  throwIfAborted(signal, 'Aborted');
  yield emit('ranking', 'Phase 4: Ranking with BM25/TF-IDF hybrid...');
  const ranked = rankArticles(curated, input.researchTopic);
  const topRanked = getTopArticles(ranked, input.topNToSynthesize).map((a) => ({
    ...a,
    sourceClass: a.sourceClass ?? inferArticleSourceClass(a),
  }));

  throwIfAborted(signal, 'Aborted');
  yield emit('synthesis', 'Phase 5: Generating extractive synthesis...');
  const report: ResearchReport = {
    ...generateResearchReport(topRanked, input.researchTopic),
    generatedQueries: [{ query: primaryQuery.query, explanation: primaryQuery.explanation }],
    corpusClass: resolveReportCorpusClass(topRanked, 'retrieved'),
    retrievalOutcome: retrievalErrorCount > 0 ? 'partial_failure' : 'ok',
  };
  yield emit('synthesis', 'Phase 5: Generating extractive synthesis...', { report });

  for await (const chunk of streamSynthesisChunks(report.synthesis, signal)) {
    yield emit('synthesis-stream', 'Streaming synthesis...', { synthesisChunk: chunk });
  }

  yield emit('finalizing', 'Phase 6: Finalizing report...');
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
