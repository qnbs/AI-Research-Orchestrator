import type { AgentName } from '../types';

/** Map a pipeline phase label to the conceptual agent role for the debugger UI. */
export function getAgentForPhase(phase: string): AgentName {
  const normalized = phase.toLowerCase();
  if (normalized.includes('generat') || normalized.includes('quer')) return 'QueryGenerator';
  if (normalized.includes('arxiv') || normalized.includes('preprint')) return 'ArxivFetcher';
  if (
    normalized.includes('pubmed') ||
    normalized.includes('search') ||
    normalized.includes('fetch') ||
    normalized.includes('detail')
  ) {
    return 'PubMedFetcher';
  }
  if (normalized.includes('rank') || normalized.includes('analys')) return 'Ranker';
  return 'Synthesizer'; // Synthesizing, Streaming, Finalizing
}
