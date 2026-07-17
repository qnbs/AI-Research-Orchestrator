import type { ResearchInput, ResearchReport, Settings } from '../../types';
import { searchPubMedForIds, fetchArticleDetails } from '../pubmedUtils';
import { searchAndFetchArxiv } from '../arxivUtils';
import { getNcbiApiKey } from '../apiKeyService';
import { AppError } from '../../lib/errors';
import { formulateQueries } from './queryFormulation';
import { rankArticles, aggregateKeywords, generateInsights } from './ranking';
import { synthesizeReportMarkdown, streamSynthesisChunks } from './synthesis';
import { selectDemoArticlesForTopic } from './sampleData';
import { throwIfAborted } from './utils';
import type { HeuristicArticleInput } from './types';

export type HeuristicStreamEvent = {
  report?: ResearchReport;
  synthesisChunk?: string;
  phase: string;
};

function phase(label: string): string {
  return `Heuristic mode · ${label}`;
}

/**
 * Full offline/no-key research orchestrator mirroring `generateResearchReportStream` phases.
 * Uses PubMed when online; falls back to curated demo corpus when offline or empty.
 */
export async function* generateHeuristicResearchReportStream(
  input: ResearchInput,
  _aiSettings: Settings['ai'],
  signal?: AbortSignal,
): AsyncGenerator<HeuristicStreamEvent> {
  throwIfAborted(signal);

  yield { phase: phase('Phase 1: Formulating PubMed-style queries…') };
  const generatedQueries = formulateQueries(input);
  throwIfAborted(signal);

  let articleDetails: HeuristicArticleInput[] = [];
  const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;

  if (isOnline) {
    yield { phase: phase('Phase 2: Executing PubMed search…') };
    try {
      const ncbiApiKey = (await getNcbiApiKey()) ?? undefined;
      throwIfAborted(signal);
      const pmids = await searchPubMedForIds(
        generatedQueries[0].query,
        input.maxArticlesToScan,
        signal,
        ncbiApiKey,
      );
      if (pmids.length > 0) {
        yield { phase: phase('Phase 3: Fetching article details…') };
        const details = await fetchArticleDetails(pmids, signal, ncbiApiKey);
        articleDetails = details.map((d) => ({
          pmid: d.pmid ?? '',
          pmcId: d.pmcId,
          title: d.title ?? '',
          authors: d.authors ?? '',
          journal: d.journal ?? '',
          pubYear: d.pubYear ?? '',
          summary: d.summary ?? '',
          isOpenAccess: Boolean(d.isOpenAccess),
          articleType: d.articleType,
        }));
      }
    } catch (err) {
      if (err instanceof AppError && err.code === 'STREAM_ABORTED') throw err;
      if (signal?.aborted) throw err;
      yield { phase: phase('PubMed unavailable — using local demo corpus…') };
    }

    if (input.includeArxiv && articleDetails.length > 0) {
      yield { phase: phase('Phase 3b: Fetching arXiv preprints…') };
      try {
        const arxivMax = Math.min(Math.floor(input.maxArticlesToScan / 2), 15);
        const arxivResults = await searchAndFetchArxiv(input.researchTopic, arxivMax, signal);
        articleDetails.push(
          ...arxivResults.map((d) => ({
            pmid: d.pmid ?? '',
            title: d.title ?? '',
            authors: d.authors ?? '',
            journal: d.journal ?? '',
            pubYear: d.pubYear ?? '',
            summary: d.summary ?? '',
            isOpenAccess: Boolean(d.isOpenAccess),
            articleType: d.articleType,
          })),
        );
      } catch {
        // arXiv is optional
      }
    }
  } else {
    yield { phase: phase('Offline — loading curated demo corpus…') };
  }

  if (articleDetails.length === 0) {
    yield { phase: phase('Selecting educational demo articles for topic…') };
    articleDetails = selectDemoArticlesForTopic(
      input.researchTopic,
      Math.min(input.maxArticlesToScan, 12),
    );
  }

  throwIfAborted(signal);
  yield { phase: phase('Phase 4: Ranking & keyword analysis…') };
  const rankedArticles = rankArticles(
    articleDetails,
    input.researchTopic,
    input.topNToSynthesize,
    signal,
  );

  const partialReport: ResearchReport = {
    generatedQueries,
    synthesis: '',
    rankedArticles,
    aiGeneratedInsights: generateInsights(rankedArticles, input.researchTopic),
    overallKeywords: aggregateKeywords(rankedArticles),
  };
  yield { report: partialReport, phase: phase('Phase 5: Synthesizing top findings…') };

  throwIfAborted(signal);
  const markdown = synthesizeReportMarkdown(
    input.researchTopic,
    input.synthesisFocus,
    rankedArticles,
  );

  for await (const chunk of streamSynthesisChunks(markdown, signal)) {
    yield { synthesisChunk: chunk, phase: phase('Streaming synthesis…') };
  }

  yield { phase: phase('Finalizing report…') };
}
