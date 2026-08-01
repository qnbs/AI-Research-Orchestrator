import type { AgentName } from '../types';

/** Map a pipeline phase label to the conceptual agent role for the debugger UI. */
export function getAgentForPhase(phase: string): AgentName {
  const p = phase.toLowerCase();
  if (p.includes('generat') || p.includes('quer')) return 'QueryGenerator';
  if (p.includes('arxiv') || p.includes('preprint')) return 'ArxivFetcher';
  if (p.includes('pubmed') || p.includes('search') || p.includes('fetch') || p.includes('detail'))
    return 'PubMedFetcher';
  if (p.includes('rank') || p.includes('analys')) return 'Ranker';
  return 'Synthesizer'; // Synthesizing, Streaming, Finalizing
}
