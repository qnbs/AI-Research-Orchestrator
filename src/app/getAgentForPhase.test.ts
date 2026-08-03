import { describe, expect, it } from 'vitest';
import { getAgentForPhase, getAgentForPhaseId } from './getAgentForPhase';

describe('getAgentForPhaseId', () => {
  it('maps typed IDs without free-text heuristics', () => {
    expect(getAgentForPhaseId('query-generation')).toBe('QueryGenerator');
    expect(getAgentForPhaseId('retrieval')).toBe('PubMedFetcher');
    expect(getAgentForPhaseId('arxiv-fetch')).toBe('ArxivFetcher');
    expect(getAgentForPhaseId('ranking')).toBe('Ranker');
    expect(getAgentForPhaseId('synthesis-stream')).toBe('Synthesizer');
    expect(getAgentForPhaseId('execution-provenance')).toBeNull();
    expect(getAgentForPhaseId('demo-corpus')).toBeNull();
    expect(getAgentForPhaseId('retrieval-status')).toBeNull();
    expect(getAgentForPhaseId('empty-retrieval')).toBeNull();
  });
});

describe('getAgentForPhase', () => {
  it('prefers phaseId over free-text (fixes PubMed+arXiv mis-map)', () => {
    expect(
      getAgentForPhase(
        'Heuristic mode · Phase 2: Retrieving articles from PubMed and arXiv...',
        'retrieval',
      ),
    ).toBe('PubMedFetcher');
    // phaseId wins even when the free-text would also resolve correctly.
    expect(getAgentForPhase('Fetching arXiv preprints', 'retrieval')).toBe('PubMedFetcher');
  });

  it('maps query-generation phases to QueryGenerator', () => {
    expect(getAgentForPhase('Generating PubMed query')).toBe('QueryGenerator');
    expect(getAgentForPhase('Query refinement')).toBe('QueryGenerator');
    expect(getAgentForPhase('ignored', 'query-generation')).toBe('QueryGenerator');
  });

  it('maps arXiv / preprint phases to ArxivFetcher', () => {
    expect(getAgentForPhase('Fetching arXiv preprints')).toBe('ArxivFetcher');
    expect(getAgentForPhase('Scanning preprint servers')).toBe('ArxivFetcher');
  });

  it('maps PubMed / search / fetch phases to PubMedFetcher', () => {
    expect(getAgentForPhase('Searching PubMed')).toBe('PubMedFetcher');
    expect(getAgentForPhase('Fetching article details')).toBe('PubMedFetcher');
    expect(
      getAgentForPhase('Heuristic mode · Phase 2: Retrieving articles from PubMed and arXiv...'),
    ).toBe('PubMedFetcher');
  });

  it('maps ranking / analysis phases to Ranker', () => {
    expect(getAgentForPhase('Ranking articles')).toBe('Ranker');
    expect(getAgentForPhase('Analysing relevance')).toBe('Ranker');
  });

  it('defaults remaining phases to Synthesizer', () => {
    expect(getAgentForPhase('Synthesizing report')).toBe('Synthesizer');
    expect(getAgentForPhase('Streaming final output')).toBe('Synthesizer');
    expect(getAgentForPhase('Finalizing')).toBe('Synthesizer');
  });
});
