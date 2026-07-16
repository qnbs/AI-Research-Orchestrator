import { describe, it, expect } from 'vitest';
import {
  buildCheckpointId,
  createResearchCheckpoint,
  isResumableCheckpoint,
} from './researchCheckpoint';
import type { ResearchInput } from '../types';

const input: ResearchInput = {
  researchTopic: 'Cancer Immunotherapy!',
  dateRange: 'any',
  articleTypes: [],
  synthesisFocus: 'overview',
  maxArticlesToScan: 10,
  topNToSynthesize: 3,
};

describe('researchCheckpoint', () => {
  it('buildCheckpointId slugifies topic', () => {
    expect(buildCheckpointId('Cancer Immunotherapy!', 1)).toBe('ckpt_cancer-immunotherapy_1');
  });

  it('createResearchCheckpoint fills defaults', () => {
    const ckpt = createResearchCheckpoint({
      input,
      phase: 'Phase 3',
      reason: 'error',
      now: 42,
      errorMessage: 'boom',
    });
    expect(ckpt.id).toContain('ckpt_');
    expect(ckpt.reason).toBe('error');
    expect(ckpt.report).toBeNull();
    expect(ckpt.synthesisSoFar).toBe('');
    expect(ckpt.errorMessage).toBe('boom');
  });

  it('isResumableCheckpoint requires articles or synthesis', () => {
    const empty = createResearchCheckpoint({ input, phase: 'p', reason: 'abort', now: 1 });
    expect(isResumableCheckpoint(empty)).toBe(false);

    const withSynth = createResearchCheckpoint({
      input,
      phase: 'p',
      reason: 'abort',
      synthesisSoFar: 'partial',
      now: 2,
    });
    expect(isResumableCheckpoint(withSynth)).toBe(true);

    const withReport = createResearchCheckpoint({
      input,
      phase: 'p',
      reason: 'error',
      report: {
        synthesis: '',
        rankedArticles: [
          {
            pmid: '1',
            title: 't',
            authors: 'a',
            journal: 'j',
            pubYear: '2020',
            summary: 's',
            relevanceScore: 1,
            relevanceExplanation: '',
            isOpenAccess: false,
            keywords: [],
          },
        ],
        generatedQueries: [],
        aiGeneratedInsights: [],
        overallKeywords: [],
      },
      now: 3,
    });
    expect(isResumableCheckpoint(withReport)).toBe(true);
  });
});
