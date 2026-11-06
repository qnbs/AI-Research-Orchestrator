import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useResearchSession } from './useResearchSession';
import { generateResearchReportStream } from '../services/geminiService';
import { defaultSettings } from '../store/slices/settingsSlice';
import agentDebugReducer from '../store/slices/agentDebugSlice';
import type { ResearchInput, ResearchReport } from '../types';
import { deleteResearchCheckpoint } from '../services/databaseService';
import type { ResearchCheckpoint } from '../lib/researchCheckpoint';
import type { TranslationKey } from '../i18n/translations';

let capturedSignal: AbortSignal | undefined;

vi.mock('../services/geminiService', () => ({
  generateResearchReportStream: vi.fn(async function* (
    _data: unknown,
    _aiSettings: unknown,
    signal: AbortSignal,
  ) {
    capturedSignal = signal;
    yield { phaseId: 'query-generation', phase: 'Phase 1: Generating queries...' };
    await new Promise<void>((_resolve, reject) => {
      signal.addEventListener('abort', () => {
        reject(new DOMException('Aborted', 'AbortError'));
      });
    });
  }),
}));

vi.mock('../services/databaseService', () => ({
  deleteResearchCheckpoint: vi.fn().mockResolvedValue(undefined),
  saveResearchCheckpoint: vi.fn().mockResolvedValue(undefined),
}));

const input: ResearchInput = {
  researchTopic: 'Immunotherapy',
  dateRange: 'any',
  articleTypes: [],
  synthesisFocus: 'overview',
  maxArticlesToScan: 10,
  topNToSynthesize: 3,
};

function wrap({ children }: { children: React.ReactNode }) {
  const store = configureStore({ reducer: { agentDebug: agentDebugReducer } });
  return <Provider store={store}>{children}</Provider>;
}

const t = ((k: TranslationKey | (string & {})) => k) as (
  key: TranslationKey | (string & {}),
) => string;

function renderSession(overrides: Partial<Parameters<typeof useResearchSession>[0]> = {}) {
  return renderHook(
    () =>
      useResearchSession({
        aiSettings: defaultSettings.ai,
        autoSaveReports: false,
        setCurrentView: vi.fn(),
        saveReport: vi.fn(),
        setNotification: vi.fn(),
        t,
        haptic: vi.fn(),
        updateTags: vi.fn(),
        onCheckpointsChanged: vi.fn(),
        ...overrides,
      }),
    { wrapper: wrap },
  );
}

const partialReport: ResearchReport = {
  synthesis: '',
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

describe('useResearchSession handleCancelResearch', () => {
  it('aborts the in-flight stream without superseding the active generation', async () => {
    const { result } = renderSession();

    let formSubmitPromise: Promise<void> | undefined;

    await act(async () => {
      formSubmitPromise = result.current.handleFormSubmit(input);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(capturedSignal).toBeDefined();
    expect(capturedSignal?.aborted).toBe(false);

    await act(async () => {
      result.current.handleCancelResearch();
      // Awaiting the retained promise (rather than a fixed number of microtask
      // flushes) lets handleFormSubmit's catch path - including
      // handleResearchStreamFailure's own checkpoint persistence - fully settle
      // before the test ends, so no state update can leak past cleanup.
      await formSubmitPromise;
    });

    expect(capturedSignal?.aborted).toBe(true);
    // Nothing was ever streamed before cancel, so this correctly returns to idle.
    expect(result.current.reportStatus).toBe('idle');
  });

  it('marks the visible report as partial (never done) when cancelled mid-stream with a report already in progress', async () => {
    vi.mocked(generateResearchReportStream).mockImplementationOnce(
      async function* (_data, _aiSettings, signal) {
        if (!signal) return;
        capturedSignal = signal;
        yield {
          phaseId: 'ranking',
          phase: 'Phase 4: Ranking articles...',
          report: partialReport,
        };
        await new Promise<void>((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      },
    );

    const { result } = renderSession();

    let formSubmitPromise: Promise<void> | undefined;
    await act(async () => {
      formSubmitPromise = result.current.handleFormSubmit(input);
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      result.current.handleCancelResearch();
      await formSubmitPromise;
    });

    // Regression coverage for the confirmed scientific-integrity bug: a
    // cancelled run with a partial report must never reach 'done' - the
    // status must distinguish it from a normally completed report, and the
    // report itself must carry why/where it stopped.
    expect(result.current.reportStatus).toBe('partial');
    expect(result.current.reportStatus).not.toBe('done');
    expect(result.current.report?.completionStatus).toBe('partial');
    expect(result.current.report?.cancelledAtPhase).toBe('Phase 4: Ranking articles...');
  });
});

describe('useResearchSession manual save fingerprint', () => {
  it('does not mark saved when the report mutates while saveReport is in flight', async () => {
    let finishSave: (() => void) | undefined;
    const saveReport = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishSave = resolve;
        }),
    );

    const { result } = renderSession({ saveReport });

    await act(async () => {
      result.current.setLocalResearchInput(input);
      result.current.setReport(partialReport);
    });

    let savePromise: Promise<void> | undefined;
    await act(async () => {
      savePromise = result.current.handleSaveReport();
      await Promise.resolve();
    });

    expect(saveReport).toHaveBeenCalledTimes(1);

    await act(async () => {
      result.current.setReport((prev) =>
        prev ? { ...prev, synthesis: `${prev.synthesis} mutated` } : prev,
      );
    });

    await act(async () => {
      finishSave?.();
      await savePromise;
    });

    expect(result.current.isCurrentReportSaved).toBe(false);
  });
});

describe('useResearchSession generation supersession', () => {
  it('does not mark a new run saved when a deferred auto-save from an old run resolves (F-02)', async () => {
    vi.mocked(generateResearchReportStream).mockImplementationOnce(async function* () {
      yield {
        phaseId: 'finalizing',
        phase: 'Finalizing...',
        report: { ...partialReport, synthesis: 'Run A synthesis' },
      };
    });

    let releaseSave: (() => void) | undefined;
    const saveReport = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          releaseSave = resolve;
        }),
    );

    const { result } = renderSession({
      autoSaveReports: true,
      saveReport,
    });

    let formSubmitPromise: Promise<void> | undefined;

    await act(async () => {
      formSubmitPromise = result.current.handleFormSubmit(input);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveReport).toHaveBeenCalledTimes(1);

    await act(async () => {
      result.current.handleNewSearch();
    });

    expect(result.current.isCurrentReportSaved).toBe(false);
    expect(result.current.reportStatus).toBe('idle');

    await act(async () => {
      releaseSave?.();
      await formSubmitPromise;
    });

    expect(result.current.isCurrentReportSaved).toBe(false);
    expect(result.current.reportStatus).toBe('idle');
  });

  it('shows an error notification when auto-save fails for the active generation', async () => {
    vi.mocked(generateResearchReportStream).mockImplementationOnce(async function* () {
      yield {
        phaseId: 'finalizing',
        phase: 'Finalizing...',
        report: { ...partialReport, synthesis: 'Done' },
      };
    });

    const saveReport = vi.fn().mockRejectedValueOnce(new Error('indexeddb failed'));
    const setNotification = vi.fn();
    const { result } = renderSession({
      autoSaveReports: true,
      saveReport,
      setNotification,
    });

    await act(async () => {
      await result.current.handleFormSubmit(input);
    });

    expect(saveReport).toHaveBeenCalledTimes(1);
    expect(setNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        message: 'settings.kb.notification.save_failed',
      }),
    );
  });

  it('does not surface auto-save failure notification after the run was superseded (F-02)', async () => {
    let releaseSave: (() => void) | undefined;
    const saveReport = vi.fn(
      () =>
        new Promise<void>((resolve, reject) => {
          releaseSave = () => reject(new Error('indexeddb failed'));
        }),
    );
    const setNotification = vi.fn();

    vi.mocked(generateResearchReportStream).mockImplementationOnce(async function* () {
      yield {
        phaseId: 'finalizing',
        phase: 'Finalizing...',
        report: { ...partialReport, synthesis: 'Run A' },
      };
    });

    const { result } = renderSession({
      autoSaveReports: true,
      saveReport,
      setNotification,
    });

    let formSubmitPromise: Promise<void> | undefined;
    await act(async () => {
      formSubmitPromise = result.current.handleFormSubmit(input);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveReport).toHaveBeenCalledTimes(1);

    await act(async () => {
      result.current.handleNewSearch();
    });

    await act(async () => {
      releaseSave?.();
      await formSubmitPromise;
    });

    expect(
      setNotification.mock.calls.some(
        (call) =>
          call[0]?.type === 'error' && call[0]?.message === 'settings.kb.notification.save_failed',
      ),
    ).toBe(false);
  });

  it('ignores stale stream completion after handleNewSearch superseded the generation', async () => {
    let releaseStream: (() => void) | undefined;
    vi.mocked(generateResearchReportStream).mockImplementationOnce(
      async function* (_data, _aiSettings, signal) {
        if (!signal) return;
        capturedSignal = signal;
        yield {
          phaseId: 'ranking',
          phase: 'Phase 4: Ranking articles...',
          report: partialReport,
        };
        await new Promise<void>((resolve) => {
          releaseStream = resolve;
        });
      },
    );

    const { result } = renderSession();

    let formSubmitPromise: Promise<void> | undefined;
    await act(async () => {
      formSubmitPromise = result.current.handleFormSubmit(input);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.reportStatus).toBe('streaming');

    await act(async () => {
      result.current.handleNewSearch();
    });
    expect(result.current.reportStatus).toBe('idle');
    expect(result.current.report).toBeNull();

    await act(async () => {
      releaseStream?.();
      await formSubmitPromise;
    });

    expect(result.current.reportStatus).toBe('idle');
    expect(result.current.reportStatus).not.toBe('done');
    expect(result.current.report).toBeNull();
  });
});

describe('useResearchSession manual save failure', () => {
  it('surfaces error notification and haptic error when saveReport rejects', async () => {
    const saveReport = vi.fn().mockRejectedValueOnce(new Error('indexeddb failed'));
    const setNotification = vi.fn();
    const haptic = vi.fn();
    const { result } = renderSession({ saveReport, setNotification, haptic });

    await act(async () => {
      result.current.setLocalResearchInput(input);
      result.current.setReport(partialReport);
    });

    await act(async () => {
      await result.current.handleSaveReport();
    });

    expect(setNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        message: 'settings.kb.notification.save_failed',
      }),
    );
    expect(haptic).toHaveBeenCalledWith('error');
  });
});

describe('useResearchSession streaming fingerprint', () => {
  it('clears saved acknowledgement when synthesis chunks arrive after a mid-stream manual save', async () => {
    let releaseMidStream: (() => void) | undefined;
    vi.mocked(generateResearchReportStream).mockImplementationOnce(async function* () {
      yield {
        phaseId: 'ranking',
        phase: 'Phase 4: Ranking articles...',
        report: partialReport,
      };
      await new Promise<void>((resolve) => {
        releaseMidStream = resolve;
      });
      yield {
        phaseId: 'synthesis',
        phase: 'Writing synthesis...',
        synthesisChunk: 'late chunk',
      };
      yield {
        phaseId: 'finalizing',
        phase: 'Finalizing...',
        report: {
          ...partialReport,
          synthesis: 'late chunk',
        },
      };
    });

    const saveReport = vi.fn().mockResolvedValue(undefined);
    const { result } = renderSession({
      // Avoid auto-save setting “saved” at completion while we assert mid-stream (F-02).
      autoSaveReports: false,
      saveReport,
    });

    let formSubmitPromise: Promise<void> | undefined;
    await act(async () => {
      formSubmitPromise = result.current.handleFormSubmit(input);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.reportStatus).toBe('streaming');

    await act(async () => {
      await result.current.handleSaveReport();
    });
    expect(saveReport).toHaveBeenCalledTimes(1);
    expect(result.current.isCurrentReportSaved).toBe(true);

    await act(async () => {
      releaseMidStream?.();
      // Let the in-flight `for await` consume the synthesis chunk (microtasks).
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(result.current.report?.synthesis).toContain('late chunk');
    });
    expect(result.current.isCurrentReportSaved).toBe(false);

    await act(async () => {
      await formSubmitPromise;
    });

    expect(result.current.reportStatus).toBe('done');
    expect(saveReport).toHaveBeenCalledTimes(1);
    expect(result.current.isCurrentReportSaved).toBe(false);
  });
});

describe('useResearchSession handleRestoreCheckpoint', () => {
  it('restores a checkpoint as partial, never done', async () => {
    const { result } = renderSession();

    const ckpt: ResearchCheckpoint = {
      id: 'ckpt_1',
      createdAt: 100,
      updatedAt: 200,
      reason: 'abort',
      phase: 'Phase 4: Ranking articles...',
      topic: 'Immunotherapy',
      input,
      report: partialReport,
      synthesisSoFar: 'partial synthesis so far',
    };

    await act(async () => {
      await result.current.handleRestoreCheckpoint(ckpt);
    });

    expect(result.current.reportStatus).toBe('partial');
    expect(result.current.reportStatus).not.toBe('done');
    expect(result.current.report?.completionStatus).toBe('partial');
    expect(result.current.report?.cancelledAtPhase).toBe('Phase 4: Ranking articles...');
    expect(result.current.report?.cancelledAt).toBe(200);
  });

  it('does not apply a stale restore after a newer generation starts during checkpoint delete', async () => {
    let releaseDelete: (() => void) | undefined;
    vi.mocked(deleteResearchCheckpoint).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releaseDelete = resolve;
        }) as ReturnType<typeof deleteResearchCheckpoint>,
    );

    const { result } = renderSession();
    const ckpt: ResearchCheckpoint = {
      id: 'ckpt_stale',
      createdAt: 100,
      updatedAt: 200,
      reason: 'abort',
      phase: 'Phase 4: Ranking articles...',
      topic: 'Immunotherapy',
      input,
      report: partialReport,
      synthesisSoFar: 'stale synthesis',
    };

    let restoreP!: Promise<boolean | void>;
    act(() => {
      restoreP = result.current.handleRestoreCheckpoint(ckpt);
    });

    act(() => {
      result.current.handleNewSearch();
    });
    expect(result.current.reportStatus).toBe('idle');
    expect(result.current.report).toBeNull();

    await act(async () => {
      releaseDelete?.();
      await restoreP;
    });

    expect(result.current.reportStatus).toBe('idle');
    expect(result.current.report).toBeNull();
    vi.mocked(deleteResearchCheckpoint).mockResolvedValue(undefined);
  });
});

describe('useResearchSession openStoredResearchEntry', () => {
  it('reopens a saved report that was completed normally as done', async () => {
    const { result } = renderSession();

    await act(async () => {
      result.current.openStoredResearchEntry({
        sourceType: 'research',
        id: 'entry-1',
        timestamp: 1,
        title: 'Immunotherapy',
        input,
        articles: [],
        report: { ...partialReport, completionStatus: undefined },
      });
    });

    expect(result.current.reportStatus).toBe('done');
  });

  it('reopens a report that was saved while still partial as partial, not done', async () => {
    const { result } = renderSession();

    await act(async () => {
      result.current.openStoredResearchEntry({
        sourceType: 'research',
        id: 'entry-2',
        timestamp: 1,
        title: 'Immunotherapy',
        input,
        articles: [],
        report: {
          ...partialReport,
          completionStatus: 'partial',
          cancelledAtPhase: 'Phase 4: Ranking articles...',
          cancelledAt: 999,
        },
      });
    });

    expect(result.current.reportStatus).toBe('partial');
    expect(result.current.reportStatus).not.toBe('done');
  });
});
