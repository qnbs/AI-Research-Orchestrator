import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import settingsReducer, { defaultSettings } from '../store/slices/settingsSlice';
import { SettingsHydrator, useSettings } from './useSettings';

vi.mock('../services/databaseService', () => ({
  getSettings: vi.fn().mockResolvedValue(undefined),
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

  it('SettingsHydrator renders null', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => SettingsHydrator(), { wrapper: Wrapper });
    expect(result.current).toBeNull();
  });
});
