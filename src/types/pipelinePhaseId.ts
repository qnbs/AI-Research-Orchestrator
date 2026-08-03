/**
 * Stable research-pipeline phase identifiers (ADR 0020).
 * Kept free of imports so store/types can reference the union without cycles.
 */

export type PipelinePhaseId =
  | 'execution-provenance'
  | 'query-generation'
  | 'pubmed-search'
  | 'pubmed-fetch'
  | 'arxiv-fetch'
  | 'ranking'
  | 'synthesis'
  | 'synthesis-stream'
  | 'finalizing'
  | 'demo-corpus'
  | 'retrieval'
  | 'curation'
  | 'retrieval-status'
  | 'empty-retrieval';

const PIPELINE_PHASE_IDS: ReadonlySet<string> = new Set<PipelinePhaseId>([
  'execution-provenance',
  'query-generation',
  'pubmed-search',
  'pubmed-fetch',
  'arxiv-fetch',
  'ranking',
  'synthesis',
  'synthesis-stream',
  'finalizing',
  'demo-corpus',
  'retrieval',
  'curation',
  'retrieval-status',
  'empty-retrieval',
]);

export function isPipelinePhaseId(value: string): value is PipelinePhaseId {
  return PIPELINE_PHASE_IDS.has(value);
}
