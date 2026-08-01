import { describe, expect, it } from 'vitest';
import { getAgentForPhase } from './getAgentForPhase';

describe('getAgentForPhase', () => {
  it('maps query-generation phases to QueryGenerator', () => {
    expect(getAgentForPhase('Generating PubMed query')).toBe('QueryGenerator');
    expect(getAgentForPhase('Query refinement')).toBe('QueryGenerator');
  });

  it('maps arXiv / preprint phases to ArxivFetcher', () => {
    expect(getAgentForPhase('Fetching arXiv preprints')).toBe('ArxivFetcher');
    expect(getAgentForPhase('Scanning preprint servers')).toBe('ArxivFetcher');
  });

  it('maps PubMed / search / fetch phases to PubMedFetcher', () => {
    expect(getAgentForPhase('Searching PubMed')).toBe('PubMedFetcher');
    expect(getAgentForPhase('Fetching article details')).toBe('PubMedFetcher');
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
