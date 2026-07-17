import type { RankedArticle, ResearchReport } from '../../types';
import type { InferenceMode } from '../inferenceMode';

/** Provenance attached to heuristic outputs so the UI can badge them. */
export type HeuristicProvenance = {
  inferenceMode: InferenceMode;
  /** Stable algorithm id for debugging / eval harness. */
  algorithm: string;
  /** ISO timestamp of generation. */
  generatedAt: string;
};

/** Marker string embedded in synthesis / summaries for clear labeling. */
export const HEURISTIC_BADGE = 'Heuristic mode';

/** Minimal article shape used by ranking before enrichment. */
export type HeuristicArticleInput = Pick<
  RankedArticle,
  'pmid' | 'title' | 'summary' | 'authors' | 'journal' | 'pubYear' | 'isOpenAccess'
> &
  Partial<Pick<RankedArticle, 'articleType' | 'pmcId' | 'keywords'>>;

/** Shared options for heuristic pipelines. */
export interface HeuristicOptions {
  /** Research topic / query text used for overlap scoring. */
  topic: string;
  /** Max articles to keep after ranking. */
  topN?: number;
  /** Abort mid-pipeline. */
  signal?: AbortSignal;
}

/** Chat session interface shared by live Gemini and heuristic adapters. */
export interface ReportChatSession {
  sendMessageStream(params: {
    message: string;
  }): Promise<AsyncGenerator<{ text?: string }, void, unknown>>;
}

/** Extended report with optional provenance (backward-compatible). */
export type HeuristicResearchReport = ResearchReport & {
  provenance?: HeuristicProvenance;
};
