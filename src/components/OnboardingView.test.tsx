import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import OnboardingView from './OnboardingView';
import settingsReducer, { defaultSettings } from '../store/slices/settingsSlice';
import themeReducer from '../store/slices/themeSlice';

vi.mock('../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    lang: 'en',
  }),
}));

function renderOnboarding(onComplete = vi.fn()) {
  const store = configureStore({
    reducer: {
      settings: settingsReducer,
      theme: themeReducer,
    },
    preloadedState: {
      settings: { data: { ...defaultSettings, hasCompletedOnboarding: false }, isLoading: false },
    },
  });
  return {
    onComplete,
    store,
    ...render(
      <Provider store={store}>
        <OnboardingView onComplete={onComplete} />
      </Provider>,
    ),
  };
}

describe('OnboardingView', () => {
  it('focuses the primary CTA and completes without a payload', () => {
    const { onComplete } = renderOnboarding();
    const start = screen.getByRole('button', { name: 'onboarding.start' });
    expect(start).toHaveFocus();
    fireEvent.click(start);
    expect(onComplete).toHaveBeenCalledWith();
  });

  it('sample CTA prefills a topic and targets orchestrator', () => {
    const { onComplete } = renderOnboarding();
    fireEvent.click(screen.getByRole('button', { name: 'onboarding.startSample' }));
    expect(onComplete).toHaveBeenCalledWith({
      nextView: 'orchestrator',
      prefillTopic: 'onboarding.sampleTopic',
    });
  });

  it('toggles language from the first screen', () => {
    const { store } = renderOnboarding();
    fireEvent.click(screen.getByRole('button', { name: 'chrome.aria.toggle_language' }));
    expect(store.getState().settings.data.appLanguage).toBe('de');
  });
});
