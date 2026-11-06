import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { KnowledgeBaseProvider, useKnowledgeBase } from './KnowledgeBaseContext';
import knowledgeBaseReducer from '../store/slices/knowledgeBaseSlice';
import uiReducer from '../store/slices/uiSlice';
import * as databaseService from '../services/databaseService';
import type { ResearchInput, ResearchReport, KnowledgeBaseEntry } from '../types';

vi.mock('../hooks/useDemoKnowledgeBaseSeed', () => ({
  useDemoKnowledgeBaseSeed: vi.fn(),
}));

vi.mock('../hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (k: string) => k, lang: 'en' as const }),
}));

vi.mock('../services/databaseService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/databaseService')>();
  return {
    ...actual,
    getAllEntries: vi.fn().mockResolvedValue([]),
    addEntry: vi.fn().mockResolvedValue(undefined),
    bulkAddEntries: vi.fn().mockResolvedValue(undefined),
  };
});

function makeTestStore() {
  return configureStore({
    reducer: { knowledgeBase: knowledgeBaseReducer, ui: uiReducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
  });
}

const minimalReport: ResearchReport = {
  synthesis: '',
  generatedQueries: [],
  rankedArticles: [],
  aiGeneratedInsights: [],
  overallKeywords: [],
};

const minimalInput: ResearchInput = {
  researchTopic: 'Test topic',
  dateRange: 'any',
  articleTypes: [],
  synthesisFocus: 'overview',
  maxArticlesToScan: 1,
  topNToSynthesize: 1,
};

function createWrapper(store: ReturnType<typeof makeTestStore>) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <KnowledgeBaseProvider>{children}</KnowledgeBaseProvider>
      </Provider>
    );
  };
}

describe('KnowledgeBaseProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(databaseService.getAllEntries).mockResolvedValue([]);
    vi.mocked(databaseService.addEntry).mockImplementation(
      () => Promise.resolve('entry-id') as unknown as ReturnType<typeof databaseService.addEntry>,
    );
    vi.mocked(databaseService.bulkAddEntries).mockImplementation(
      () => Promise.resolve() as unknown as ReturnType<typeof databaseService.bulkAddEntries>,
    );
  });

  it('saveReport rejects when addKbEntry fails and dispatches an error notification (F-01)', async () => {
    vi.mocked(databaseService.addEntry).mockRejectedValueOnce(new Error('indexeddb failed'));
    const store = makeTestStore();
    const { result } = renderHook(() => useKnowledgeBase(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(store.getState().knowledgeBase.isLoading).toBe(false);
    });

    let caught: unknown;
    await act(async () => {
      try {
        await result.current.saveReport(minimalInput, minimalReport);
      } catch (e) {
        caught = e;
      }
    });
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toBe('Knowledge Base save failed');

    await waitFor(() => {
      const n = store.getState().ui.notification;
      expect(n?.type).toBe('error');
      expect(n?.message).toBe('settings.kb.notification.save_failed');
    });
  });

  it('addKnowledgeBaseEntries rejects when importKbEntries fails', async () => {
    vi.mocked(databaseService.bulkAddEntries).mockRejectedValueOnce(
      new Error('bulk import failed'),
    );
    const store = makeTestStore();
    const { result } = renderHook(() => useKnowledgeBase(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => {
      expect(store.getState().knowledgeBase.isLoading).toBe(false);
    });

    const dummyEntry: KnowledgeBaseEntry = {
      id: 'e1',
      timestamp: 1,
      sourceType: 'research',
      title: 't',
      articles: [],
      input: minimalInput,
      report: minimalReport,
    };

    let importErr: unknown;
    await act(async () => {
      try {
        await result.current.addKnowledgeBaseEntries([dummyEntry]);
      } catch (e) {
        importErr = e;
      }
    });
    expect(importErr).toBeInstanceOf(Error);
    expect((importErr as Error).message).toBe('Knowledge Base save failed');
  });
});
