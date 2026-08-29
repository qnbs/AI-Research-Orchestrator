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

  it('marks an aborted report with a partial report already collected as partial, never done, and stamps cancellation provenance', async () => {
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
    // Regression coverage: a cancelled report with a partial result must never
    // be indistinguishable from a normally completed one - the report itself
    // carries the cancellation marker (so it survives save/export/reopen),
    // and the status is 'partial', never 'done'.
    expect(handlers.setReport).toHaveBeenCalledWith({
      ...report,
      synthesis: 'partial synthesis',
      completionStatus: 'partial',
      cancelledAtPhase: 'Phase 5',
      cancelledAt: 123,
    });
    expect(handlers.setNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 123,
        type: 'success',
        message: expect.stringContaining('Partial research saved locally'),
      }),
    );
    expect(handlers.dispatch).toHaveBeenCalledWith(completeTrace({ status: 'error' }));
    expect(handlers.setReportStatus).toHaveBeenCalledWith('partial');
    expect(handlers.setReportStatus).not.toHaveBeenCalledWith('done');
    expect(handlers.setError).not.toHaveBeenCalled();
  });

  it('returns to idle, not done, when the stream is aborted before any report exists', async () => {
    const handlers = createHandlers();
    const abortError = new DOMException('Aborted', 'AbortError');

    await handleResearchStreamFailure({
      error: abortError,
      currentGenerationId: 1,
      input,
      phase: 'Phase 1',
      finalReport: null,
      finalSynthesis: '',
      ...handlers,
    });

    expect(handlers.setReportStatus).toHaveBeenCalledWith('idle');
    expect(handlers.setReportStatus).not.toHaveBeenCalledWith('done');
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

  it('stamps the partial report synchronously before the checkpoint write, and skips only the notification when a newer run starts while the write is in flight', async () => {
    let activeGenerationId = 1;
    const setReport = vi.fn();
    const setReportStatus = vi.fn();
    const setNotification = vi.fn();
    const persistCheckpoint = vi.fn().mockImplementation(async () => {
      // Simulates a new search bumping generationIdRef while this cancelled
      // run's checkpoint write is still resolving (the async gap this fix closes).
      activeGenerationId = 2;
      return 'checkpoint-id';
    });
    const abortError = new DOMException('Aborted', 'AbortError');

    await handleResearchStreamFailure({
      error: abortError,
      currentGenerationId: 1,
      input,
      phase: 'Phase 5',
      finalReport: report,
      finalSynthesis: 'partial synthesis',
      dispatch: vi.fn() as unknown as AppDispatch,
      setReport,
      setReportStatus,
      setError: vi.fn(),
      setNotification,
      persistCheckpoint,
      getActiveGenerationId: () => activeGenerationId,
      previousAgent: null,
    });

    expect(persistCheckpoint).toHaveBeenCalled();
    // setReport and setReportStatus fire synchronously, before the async persist
    // gap even opens - this generation was still active at that point, so
    // stamping the visible report + leaving `streaming` is correct regardless
    // of what happens afterward. Only the notification (guarded inside the
    // async branch) correctly gets skipped once a newer generation has taken over.
    expect(setReport).toHaveBeenCalledTimes(1);
    expect(setReport).toHaveBeenCalledWith(
      expect.objectContaining({ completionStatus: 'partial', cancelledAtPhase: 'Phase 5' }),
    );
    expect(setReportStatus).toHaveBeenCalledWith('partial');
    expect(setNotification).not.toHaveBeenCalled();
  });

  it('sets partial lifecycle status before persistCheckpoint is awaited', async () => {
    const order: string[] = [];
    const persistCheckpoint = vi.fn().mockImplementation(async () => {
      order.push('persist');
      return 'checkpoint-id';
    });
    const setReport = vi.fn().mockImplementation(() => {
      order.push('report');
    });
    const setReportStatus = vi.fn().mockImplementation(() => {
      order.push('status');
    });
    const abortError = new DOMException('Aborted', 'AbortError');

    await handleResearchStreamFailure({
      error: abortError,
      currentGenerationId: 1,
      input,
      phase: 'Phase 5',
      finalReport: report,
      finalSynthesis: 'partial synthesis',
      dispatch: vi.fn() as unknown as AppDispatch,
      setReport,
      setReportStatus,
      setError: vi.fn(),
      setNotification: vi.fn(),
      persistCheckpoint,
      getActiveGenerationId: () => 1,
      previousAgent: null,
    });

    expect(order.slice(0, 3)).toEqual(['report', 'status', 'persist']);
  });
});
