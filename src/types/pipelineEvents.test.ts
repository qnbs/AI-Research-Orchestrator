import { describe, expect, it } from 'vitest';
import {
  isPipelinePhaseId,
  makePipelineEvent,
  PIPELINE_PHASE_AGENT,
  PIPELINE_TIMELINE_INDEX,
} from './pipelineEvents';

describe('pipelineEvents', () => {
  it('recognizes stable phase IDs', () => {
    expect(isPipelinePhaseId('ranking')).toBe(true);
    expect(isPipelinePhaseId('Phase 4: AI Ranking')).toBe(false);
  });

  it('maps retrieval (PubMed+arXiv) to PubMedFetcher, not ArxivFetcher', () => {
    expect(PIPELINE_PHASE_AGENT.retrieval).toBe('PubMedFetcher');
    expect(PIPELINE_PHASE_AGENT['arxiv-fetch']).toBe('ArxivFetcher');
  });

  it('skips agent chrome for provenance', () => {
    expect(PIPELINE_PHASE_AGENT['execution-provenance']).toBeNull();
    expect(PIPELINE_TIMELINE_INDEX['execution-provenance']).toBe(-1);
  });

  it('makePipelineEvent sets phaseId and default label', () => {
    const event = makePipelineEvent('ranking', {
      promptBudget: {
        stage: 'ranking',
        provider: 'gemini',
        model: 'm',
        totalRetrieved: 1,
        includedInPrompt: 1,
        omittedFromPrompt: 0,
        omittedPmids: [],
        estimatedPromptTokens: 10,
        inputTokenBudget: 1000,
        chunkIndex: 1,
        chunkCount: 1,
        truncatedTitleCount: 0,
        truncatedAbstractCount: 0,
        selectionMode: 'full-corpus',
      },
    });
    expect(event.phaseId).toBe('ranking');
    expect(event.phase).toContain('Phase 4');
    expect(event.promptBudget?.stage).toBe('ranking');
  });
});
