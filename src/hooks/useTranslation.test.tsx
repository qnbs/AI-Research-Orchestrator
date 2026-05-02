import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import settingsReducer, { defaultSettings } from '../store/slices/settingsSlice';
import { useTranslation } from './useTranslation';

function makeWrapper(lang: 'en' | 'de') {
  const store = configureStore({
    reducer: { settings: settingsReducer },
    preloadedState: {
      settings: {
        data: { ...defaultSettings, appLanguage: lang },
        isLoading: false,
      },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  };
}

describe('useTranslation', () => {
  it('resolves key for current language', () => {
    const { result } = renderHook(() => useTranslation(), { wrapper: makeWrapper('en') });
    expect(result.current.t('nav.home')).toBeTruthy();
    expect(result.current.lang).toBe('en');
  });

  it('falls back to English for unknown keys', () => {
    const { result } = renderHook(() => useTranslation(), { wrapper: makeWrapper('de') });
    expect(result.current.t('___missing___')).toBe('___missing___');
  });
});
