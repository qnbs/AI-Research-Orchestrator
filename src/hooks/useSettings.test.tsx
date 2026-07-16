import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import settingsReducer, { defaultSettings } from '../store/slices/settingsSlice';
import { SettingsHydrator, useSettings } from './useSettings';
import {
  getSettings as getSettingsFromDb,
  saveSettings as saveSettingsToDb,
} from '../services/databaseService';
import { saveNcbiApiKey } from '../services/apiKeyService';

vi.mock('../services/databaseService', () => ({
  getSettings: vi.fn().mockResolvedValue(undefined),
  saveSettings: vi.fn().mockResolvedValue('appSettings'),
}));

vi.mock('../services/apiKeyService', () => ({
  saveNcbiApiKey: vi.fn().mockResolvedValue(undefined),
}));

function makeWrapper() {
  const store = configureStore({
    reducer: { settings: settingsReducer },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return { store, Wrapper };
}

describe('useSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes defaults and updateSettings', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useSettings(), { wrapper: Wrapper });
    expect(result.current.settings.appLanguage).toBe(defaultSettings.appLanguage);

    act(() => {
      result.current.updateSettings({ appLanguage: 'de' });
    });
    expect(result.current.settings.appLanguage).toBe('de');

    act(() => {
      result.current.updateSettings((prev) => ({ ...prev, appLanguage: 'en' }));
    });
    expect(result.current.settings.appLanguage).toBe('en');

    act(() => {
      result.current.resetSettings();
    });
    expect(result.current.settings.appLanguage).toBe(defaultSettings.appLanguage);
  });

  it('SettingsHydrator renders null and calls the settings hydrator source', async () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => SettingsHydrator(), { wrapper: Wrapper });
    expect(result.current).toBeNull();
    await waitFor(() => expect(getSettingsFromDb).toHaveBeenCalled());
  });

  it('SettingsHydrator fills missing AI settings from defaults', async () => {
    const storedAi = { ...defaultSettings.ai, temperature: 0.7 };
    delete (storedAi as Partial<typeof defaultSettings.ai>).ncbiApiKey;
    vi.mocked(getSettingsFromDb).mockResolvedValueOnce({
      ...defaultSettings,
      appLanguage: 'de',
      ai: storedAi,
    } as typeof defaultSettings);

    const { store, Wrapper } = makeWrapper();
    renderHook(() => SettingsHydrator(), { wrapper: Wrapper });

    await waitFor(() => expect(getSettingsFromDb).toHaveBeenCalled());
    await waitFor(() => expect(store.getState().settings.isLoading).toBe(false));
    expect(store.getState().settings.data.appLanguage).toBe('de');
    expect(store.getState().settings.data.ai.temperature).toBe(0.7);
    expect(store.getState().settings.data.ai.ncbiApiKey).toBe(defaultSettings.ai.ncbiApiKey);
  });

  it('SettingsHydrator migrates legacy plaintext NCBI key into the encrypted vault', async () => {
    vi.mocked(getSettingsFromDb).mockResolvedValueOnce({
      ...defaultSettings,
      ai: {
        ...defaultSettings.ai,
        ncbiApiKey: ' legacy-ncbi-key ',
      },
    });

    const { store, Wrapper } = makeWrapper();
    renderHook(() => SettingsHydrator(), { wrapper: Wrapper });

    await waitFor(() => expect(saveNcbiApiKey).toHaveBeenCalledWith('legacy-ncbi-key'));
    await waitFor(() => expect(store.getState().settings.isLoading).toBe(false));
    expect(store.getState().settings.data.ai.ncbiApiKey).toBe('');
    expect(saveSettingsToDb).toHaveBeenCalledWith(
      expect.objectContaining({
        ai: expect.objectContaining({ ncbiApiKey: '' }),
      }),
    );
  });
});
