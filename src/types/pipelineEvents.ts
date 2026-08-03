/**
 * Typed research-pipeline phase IDs and stream events (ADR 0020).
 * Control flow and agent mapping use stable IDs — not free-text phase labels.
 */

import type { AgentName, ResearchReport } from '../types';
import type { PromptBudgetAccounting } from '../lib/promptBudget';
import type { ResearchExecutionContext } from '../lib/researchExecutionContext';
import type { PipelinePhaseId } from './pipelinePhaseId';

export type { PipelinePhaseId } from './pipelinePhaseId';
export { isPipelinePhaseId } from './pipelinePhaseId';

/**
 * Conceptual agent role for the debugger.
 * `null` = status/metadata phase — update timeline only, do not invent agent work.
 */
export const PIPELINE_PHASE_AGENT: Record<PipelinePhaseId, AgentName | null> = {
  'execution-provenance': null,
  'query-generation': 'QueryGenerator',
  'pubmed-search': 'PubMedFetcher',
  'pubmed-fetch': 'PubMedFetcher',
  'arxiv-fetch': 'ArxivFetcher',
  ranking: 'Ranker',
  synthesis: 'Synthesizer',
  'synthesis-stream': 'Synthesizer',
  finalizing: 'Synthesizer',
  // Demo / status / empty outcomes are not PubMed or synthesis agent work.
  'demo-corpus': null,
  retrieval: 'PubMedFetcher',
  curation: 'PubMedFetcher',
  'retrieval-status': null,
  'empty-retrieval': null,
};

/**
 * Default English transport labels for producers/debugger fallbacks.
 * User-facing chrome resolves `orchestrator.pipeline.<phaseId>` via i18n.
 */
export const PIPELINE_PHASE_LABEL: Record<PipelinePhaseId, string> = {
  'execution-provenance': 'execution-provenance',
  'query-generation': 'Phase 1: AI Generating PubMed Queries...',
  'pubmed-search': 'Phase 2: Executing Real-time PubMed Search...',
  'pubmed-fetch': 'Phase 3: Fetching Article Details from PubMed...',
  'arxiv-fetch': 'Phase 3b: Fetching arXiv Preprints...',
  ranking: 'Phase 4: AI Ranking & Analysis of Real Articles...',
  synthesis: 'Phase 5: Synthesizing Top Findings...',
  'synthesis-stream': 'Streaming Synthesis...',
  finalizing: 'Finalizing Report...',
  'demo-corpus': 'Educational demo mode — loading synthetic demo corpus...',
  retrieval: 'Phase 2: Retrieving articles from PubMed and arXiv...',
  curation: 'Phase 3: Curating and deduplicating results...',
  'retrieval-status': 'Retrieval status update...',
  'empty-retrieval': 'Empty retrieval — no scientific corpus assembled...',
};

/**
 * Map fine-grained phase IDs onto the 7-step Orchestrator loading timeline
 * (`orchestrator.phase1` … `phase7`). `-1` means “do not advance the timeline”.
 */
export const PIPELINE_TIMELINE_INDEX: Record<PipelinePhaseId, number> = {
  'execution-provenance': -1,
  'query-generation': 0,
  'pubmed-search': 1,
  retrieval: 1,
  'demo-corpus': 1,
  'pubmed-fetch': 2,
  curation: 2,
  'arxiv-fetch': 2,
  'retrieval-status': 2,
  ranking: 3,
  synthesis: 4,
  'empty-retrieval': 4,
  'synthesis-stream': 5,
  finalizing: 6,
};

/** Canonical research stream event (live + Non-AI + adapter). */
export type ResearchStreamEvent = {
  /** Stable ID for agent mapping, timeline, and checkpoints. */
  phaseId: PipelinePhaseId;
  /** Human-readable label for debugger / legacy UI (may be locale-agnostic English). */
  phase: string;
  report?: ResearchReport;
  synthesisChunk?: string;
  promptBudget?: PromptBudgetAccounting;
  /** Present on the first event; frozen for the rest of the run. */
  executionContext?: ResearchExecutionContext;
};

export type MakePipelineEventExtras = {
  phase?: string;
  report?: ResearchReport;
  synthesisChunk?: string;
  promptBudget?: PromptBudgetAccounting;
  executionContext?: ResearchExecutionContext;
};

/** Build a stream event with a stable phaseId and default display label. */
export function makePipelineEvent(
  phaseId: PipelinePhaseId,
  extras: MakePipelineEventExtras = {},
): ResearchStreamEvent {
  const { phase, ...rest } = extras;
  return {
    phaseId,
    phase: phase ?? PIPELINE_PHASE_LABEL[phaseId],
    ...rest,
  };
}
