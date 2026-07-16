import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppDispatch } from '../store/store';
import type { AgentName, ResearchInput, ResearchReport } from '../types';
import { completeTrace, setAgentStatus } from '../store/slices/agentDebugSlice';
import { handleResearchStreamFailure } from './researchStreamFailure';

const input: ResearchInput = {
  researchTopic: 'checkpoint topic',
  dateRange: 'any',
  articleTypes: [],
  synthesisFocus: 'overview',
  maxArticlesToScan: 10,
  topNToSynthesize: 3,
};

const report: ResearchReport = {
  synthesis: 'initial synthesis',
  generatedQueries: [],
  rankedArticles: [
    {
      pmid: '1',
      title: 'Article',
      authors: 'Author',
      journal: 'Journal',
      pubYear: '2026',
      summary: 'Summary',
      relevanceScore: 1,
      relevanceExplanation: 'Relevant',
      keywords: [],
      isOpenAccess: false,
    },
  ],
  aiGeneratedInsights: [],
  overallKeywords: [],
};

function createHandlers(
  overrides: { activeGenerationId?: number; previousAgent?: AgentName | null } = {},
) {
  return {
    dispatch: vi.fn() as unknown as AppDispatch,
    setReport: vi.fn(),
    setReportStatus: vi.fn(),
    setError: vi.fn(),
    setNotification: vi.fn(),
    persistCheckpoint: vi.fn().mockResolvedValue('checkpoint-id'),
    getActiveGenerationId: () => overrides.activeGenerationId ?? 1,
    previousAgent: overrides.previousAgent ?? null,
  };
}

describe('handleResearchStreamFailure', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does nothing when the failed stream was superseded', async () => {
    const handlers = createHandlers({ activeGenerationId: 2, previousAgent: 'Ranker' });

    await handleResearchStreamFailure({
      error: new Error('stale failure'),
      currentGenerationId: 1,
      input,
      phase: 'Phase 4',
      finalReport: report,
      finalSynthesis: 'partial synthesis',
      ...handlers,
    });

    expect(handlers.persistCheckpoint).not.toHaveBeenCalled();
    expect(handlers.dispatch).not.toHaveBeenCalled();
    expect(handlers.setNotification).not.toHaveBeenCalled();
    expect(handlers.setError).not.toHaveBeenCalled();
  });

  it('saves resumable abort checkpoints and returns to a done report state', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(123);
    const handlers = createHandlers();
    const abortError = new DOMException('Aborted', 'AbortError');

    await handleResearchStreamFailure({
      error: abortError,
      currentGenerationId: 1,
      input,
      phase: 'Phase 5',
      finalReport: report,
      finalSynthesis: 'partial synthesis',
      ...handlers,
    });

    expect(handlers.persistCheckpoint).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'abort',
        phase: 'Phase 5',
        synthesisSoFar: 'partial synthesis',
        errorMessage: undefined,
      }),
    );
    expect(handlers.setReport).toHaveBeenCalledWith({ ...report, synthesis: 'partial synthesis' });
    expect(handlers.setNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 123,
        type: 'success',
        message: expect.stringContaining('Partial research saved locally'),
      }),
    );
    expect(handlers.dispatch).toHaveBeenCalledWith(completeTrace({ status: 'error' }));
    expect(handlers.setReportStatus).toHaveBeenCalledWith('done');
    expect(handlers.setError).not.toHaveBeenCalled();
  });

  it('saves resumable error checkpoints and marks the active trace as failed', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(456);
    const handlers = createHandlers({ previousAgent: 'Ranker' });

    await handleResearchStreamFailure({
      error: new Error('PubMed request failed'),
      currentGenerationId: 1,
      input,
      phase: 'Phase 3: Fetching Article Details from PubMed...',
      finalReport: report,
      finalSynthesis: 'partial synthesis',
      ...handlers,
    });

    expect(handlers.persistCheckpoint).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'error',
        errorMessage: 'PubMed is temporarily unavailable. Please try again.',
      }),
    );
    expect(handlers.setNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 456,
        type: 'error',
        message: expect.stringContaining('Research failed'),
      }),
    );
    expect(handlers.dispatch).toHaveBeenCalledWith(
      setAgentStatus({ agentName: 'Ranker', status: 'error' }),
    );
    expect(handlers.dispatch).toHaveBeenCalledWith(completeTrace({ status: 'error' }));
    expect(handlers.setError).toHaveBeenCalledWith(
      'PubMed is temporarily unavailable. Please try again.',
    );
    expect(handlers.setReportStatus).toHaveBeenCalledWith('error');
  });
});
