import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import settingsReducer, { defaultSettings, updateSettings } from '../store/slices/settingsSlice';
import { useInferenceMode } from './useInferenceMode';

vi.mock('../services/apiKeyService', () => ({
  hasProviderApiKey: vi.fn(() => new Promise<boolean>(() => {})),
}));

function renderWithProvider(provider: 'gemini' | 'ollama' = 'gemini') {
  const store = configureStore({
    reducer: { settings: settingsReducer },
    preloadedState: {
      settings: {
        data: {
          ...defaultSettings,
          ai: { ...defaultSettings.ai, provider, forceHeuristicMode: false },
        },
        isLoading: false,
      },
    },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  const hook = renderHook(() => useInferenceMode(), { wrapper: Wrapper });
  return { store, ...hook };
}

describe('useInferenceMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes the selected provider immediately while snapshot refresh is pending', () => {
    const { store, result } = renderWithProvider('gemini');
    expect(result.current.provider).toBe('gemini');

    act(() => {
      store.dispatch(
        updateSettings({
          ai: { ...store.getState().settings.data.ai, provider: 'ollama' },
        }),
      );
    });

    expect(result.current.provider).toBe('ollama');
  });
});
