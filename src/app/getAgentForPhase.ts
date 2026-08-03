import type { AgentName } from '../types';
import {
  isPipelinePhaseId,
  PIPELINE_PHASE_AGENT,
  type PipelinePhaseId,
} from '../types/pipelineEvents';

/** Resolve the conceptual agent for a typed phase ID (preferred path). */
export function getAgentForPhaseId(phaseId: PipelinePhaseId): AgentName | null {
  return PIPELINE_PHASE_AGENT[phaseId];
}

/**
 * Map a pipeline phase to the conceptual agent role for the debugger UI.
 * Prefer passing `phaseId` — free-text `phase` is legacy fallback only.
 */
export function getAgentForPhase(phase: string, phaseId?: PipelinePhaseId): AgentName {
  const resolvedId = phaseId ?? (isPipelinePhaseId(phase) ? phase : undefined);
  if (resolvedId) {
    const agent = getAgentForPhaseId(resolvedId);
    if (agent) return agent;
  }

  // Legacy substring fallback for callers that still pass free-text only.
  const normalized = phase.toLowerCase();
  if (normalized.includes('generat') || normalized.includes('quer')) return 'QueryGenerator';
  // Combined "PubMed and arXiv" retrieval must not match the arxiv substring first.
  if (
    (normalized.includes('pubmed') && normalized.includes('arxiv')) ||
    normalized.includes('retriev')
  ) {
    return 'PubMedFetcher';
  }
  if (normalized.includes('arxiv') || normalized.includes('preprint')) return 'ArxivFetcher';
  if (
    normalized.includes('pubmed') ||
    normalized.includes('search') ||
    normalized.includes('fetch') ||
    normalized.includes('detail') ||
    normalized.includes('curat')
  ) {
    return 'PubMedFetcher';
  }
  if (normalized.includes('rank') || normalized.includes('analys')) return 'Ranker';
  return 'Synthesizer';
}
