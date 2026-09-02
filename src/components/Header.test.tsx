import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { Header } from './Header';
import settingsReducer, { defaultSettings } from '../store/slices/settingsSlice';
import uiReducer from '../store/slices/uiSlice';
import themeReducer from '../store/slices/themeSlice';
import agentDebugReducer from '../store/slices/agentDebugSlice';

function renderHeader(developerMode: boolean) {
  const store = configureStore({
    reducer: {
      settings: settingsReducer,
      ui: uiReducer,
      theme: themeReducer,
      agentDebug: agentDebugReducer,
    },
    preloadedState: {
      settings: { data: { ...defaultSettings, developerMode }, isLoading: false },
    },
  });
  return render(
    <Provider store={store}>
      <Header
        onViewChange={vi.fn()}
        currentView="home"
        knowledgeBaseArticleCount={0}
        hasReports={false}
        isResearching={false}
        onQuickAdd={vi.fn()}
      />
    </Provider>,
  );
}

describe('Header developer-mode gating', () => {
  it('hides the Agent Debugger toggle when developerMode is off', () => {
    renderHeader(false);
    expect(screen.queryByRole('button', { name: 'Toggle Agent Debugger' })).not.toBeInTheDocument();
  });

  it('shows the Agent Debugger toggle when developerMode is on', () => {
    renderHeader(true);
    expect(screen.getAllByRole('button', { name: 'Toggle Agent Debugger' })).toHaveLength(2);
  });
});
