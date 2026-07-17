import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useResearchAssistant } from './useResearchAssistant';
import type { Settings } from '../types';

const triggerAnalysis = vi.fn().mockReturnValue({
  unwrap: () =>
    Promise.resolve({
      summary: 's',
      keyFindings: ['k'],
      synthesizedTopic: 'topic',
    }),
  abort: vi.fn(),
});
const triggerSimilar = vi.fn().mockReturnValue({
  unwrap: () => Promise.resolve([]),
  abort: vi.fn(),
});
const triggerOnline = vi.fn().mockReturnValue({
  unwrap: () => Promise.resolve({ summary: '', sources: [] }),
  abort: vi.fn(),
});

vi.mock('../store/slices/geminiApiSlice', () => ({
  useLazyGenerateAnalysisQuery: () => [triggerAnalysis],
  useLazyFindSimilarArticlesQuery: () => [triggerSimilar],
  useLazyFindRelatedOnlineQuery: () => [triggerOnline],
}));

const ai: Settings['ai'] = {
  model: 'gemini-2.5-flash',
  customPreamble: '',
  temperature: 0.5,
  aiLanguage: 'English',
  aiPersona: 'Neutral Scientist',
  researchAssistant: {
    autoFetchSimilar: false,
    autoFetchOnline: false,
    authorSearchLimit: 10,
  },
  enableTldr: true,
  ncbiApiKey: '',
};

describe('useResearchAssistant', () => {
  it('startResearch runs analysis and updates state', async () => {
    const setView = vi.fn();
    const { result } = renderHook(() => useResearchAssistant(ai, setView));

    await act(async () => {
      await result.current.startResearch('  query text  ');
    });

    await waitFor(() => {
      expect(result.current.analysis?.synthesizedTopic).toBe('topic');
    });
    expect(setView).toHaveBeenCalledWith('research');
    expect(triggerAnalysis).toHaveBeenCalled();
  });

  it('clearResearch resets state', async () => {
    const { result } = renderHook(() => useResearchAssistant(ai, vi.fn()));
    await act(async () => {
      await result.current.startResearch('q');
    });
    await waitFor(() => expect(result.current.analysis).not.toBeNull());
    act(() => {
      result.current.clearResearch();
    });
    expect(result.current.analysis).toBeNull();
  });

  it('aborts inflight analysis on unmount', async () => {
    const abort = vi.fn();
    let resolveAnalysis!: (value: unknown) => void;
    triggerAnalysis.mockReturnValueOnce({
      unwrap: () =>
        new Promise((resolve) => {
          resolveAnalysis = resolve;
        }),
      abort,
    });

    const { result, unmount } = renderHook(() => useResearchAssistant(ai, vi.fn()));
    act(() => {
      void result.current.startResearch('pending');
    });
    await waitFor(() => expect(triggerAnalysis).toHaveBeenCalled());
    unmount();
    expect(abort).toHaveBeenCalled();
    resolveAnalysis({
      summary: 's',
      keyFindings: ['k'],
      synthesizedTopic: 'topic',
    });
  });
});
