import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useResearchSession } from './useResearchSession';
import { defaultSettings } from '../store/slices/settingsSlice';
import agentDebugReducer from '../store/slices/agentDebugSlice';
import type { ResearchInput } from '../types';
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

describe('useResearchSession handleCancelResearch', () => {
  it('aborts the in-flight stream without superseding the active generation', async () => {
    const { result } = renderHook(
      () =>
        useResearchSession({
          aiSettings: defaultSettings.ai,
          autoSaveReports: false,
          setCurrentView: vi.fn(),
          saveReport: vi.fn(),
          setNotification: vi.fn(),
          t: ((k: TranslationKey | (string & {})) => k) as (
            key: TranslationKey | (string & {}),
          ) => string,
          haptic: vi.fn(),
          updateTags: vi.fn(),
          onCheckpointsChanged: vi.fn(),
        }),
      { wrapper: wrap },
    );

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
  });
});
