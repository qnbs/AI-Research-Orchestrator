import type { InferenceModeSnapshot } from '../services/inferenceMode';

export type ProviderReadiness =
  'remote-ai-ready' | 'local-ai-ready' | 'heuristic-ready' | 'unavailable';

export type RetrievalReach = 'online' | 'offline';

export interface RetrievalReadiness {
  pubmed: RetrievalReach;
  arxiv: RetrievalReach | 'disabled';
}

export interface ResearchCapabilities {
  providerReadiness: ProviderReadiness;
  retrieval: RetrievalReadiness;
  /** New PubMed/arXiv fetch for a literature review (requires network). */
  canRunFullLiteratureReview: boolean;
  /** KB, saved reports, heuristic chat on existing corpus, etc. */
  canAnalyzeLocalContent: boolean;
}

export interface DeriveResearchCapabilitiesInput {
  snapshot: InferenceModeSnapshot;
  /** User default / form toggle for arXiv in orchestrator pipeline. */
  includeArxiv: boolean;
}

/**
 * Pure capability matrix: separates inference backend from literature retrieval.
 * Does not probe PubMed/arXiv reachability — only browser online + settings.
 */
export function deriveResearchCapabilities(
  input: DeriveResearchCapabilitiesInput,
): ResearchCapabilities {
  const { snapshot, includeArxiv } = input;
  const retrievalOnline: RetrievalReach = snapshot.isOnline ? 'online' : 'offline';
  const retrieval: RetrievalReadiness = {
    pubmed: retrievalOnline,
    arxiv: includeArxiv ? retrievalOnline : 'disabled',
  };

  if (snapshot.forceHeuristic || snapshot.provider === 'heuristic') {
    return {
      providerReadiness: 'heuristic-ready',
      retrieval,
      canRunFullLiteratureReview: snapshot.isOnline,
      canAnalyzeLocalContent: true,
    };
  }

  if (!snapshot.isOnline) {
    return {
      providerReadiness: 'heuristic-ready',
      retrieval,
      canRunFullLiteratureReview: false,
      canAnalyzeLocalContent: true,
    };
  }

  if (!snapshot.hasApiKey) {
    return {
      providerReadiness: 'heuristic-ready',
      retrieval,
      canRunFullLiteratureReview: snapshot.isOnline,
      canAnalyzeLocalContent: true,
    };
  }

  if (snapshot.provider === 'ollama') {
    return {
      providerReadiness: 'local-ai-ready',
      retrieval,
      canRunFullLiteratureReview: true,
      canAnalyzeLocalContent: true,
    };
  }

  return {
    providerReadiness: 'remote-ai-ready',
    retrieval,
    canRunFullLiteratureReview: true,
    canAnalyzeLocalContent: true,
  };
}
