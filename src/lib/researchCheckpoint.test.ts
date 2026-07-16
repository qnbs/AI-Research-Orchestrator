import { describe, it, expect } from 'vitest';
import {
  buildCheckpointId,
  createResearchCheckpoint,
  formatCheckpointAge,
  isResumableCheckpoint,
  reportFromCheckpoint,
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
    expect(buildCheckpointId('Cancer Immunotherapy!', 1, 'uuid-test')).toBe(
      'ckpt_cancer-immunotherapy_1_uuid-test',
    );
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

  it('formatCheckpointAge and reportFromCheckpoint', () => {
    expect(formatCheckpointAge(Date.now() - 30_000)).toBe('just now');
    expect(formatCheckpointAge(Date.now() - 5 * 60_000)).toBe('5m ago');
    expect(formatCheckpointAge(Date.now() - 3 * 3600_000)).toBe('3h ago');

    const ckpt = createResearchCheckpoint({
      input,
      phase: 'Phase 6',
      reason: 'abort',
      synthesisSoFar: 'Hello synth',
      report: {
        synthesis: 'old',
        rankedArticles: [],
        generatedQueries: [{ query: 'q', explanation: 'e' }],
        aiGeneratedInsights: [],
        overallKeywords: [],
      },
      now: 10,
    });
    const report = reportFromCheckpoint(ckpt);
    expect(report?.synthesis).toBe('Hello synth');
    expect(report?.generatedQueries).toHaveLength(1);
  });
});
