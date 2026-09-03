import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { Header } from './Header';
import settingsReducer, { defaultSettings } from '../store/slices/settingsSlice';
import uiReducer from '../store/slices/uiSlice';
import themeReducer from '../store/slices/themeSlice';
import agentDebugReducer from '../store/slices/agentDebugSlice';

function renderHeader(developerMode: boolean, currentView: 'home' | 'collections' = 'home') {
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
        currentView={currentView}
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

describe('Header overflow disclosures', () => {
  it('exposes More as a disclosure, describes muted destinations, and closes on Escape', () => {
    renderHeader(false);
    const overflow = screen.getByRole('button', { name: 'More destinations' });
    expect(overflow).toHaveAttribute('aria-expanded', 'false');
    expect(overflow).not.toHaveAttribute('aria-current');

    fireEvent.click(overflow);
    expect(overflow).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Dashboard' })).toHaveAttribute(
      'aria-describedby',
      'header-report-hint',
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(overflow).toHaveAttribute('aria-expanded', 'false');
    expect(overflow).toHaveFocus();
  });

  it('labels both language toggles', () => {
    renderHeader(false);
    expect(screen.getAllByRole('button', { name: 'Toggle Language' })).toHaveLength(2);
  });

  it('highlights More on overflow destinations without aria-current', () => {
    renderHeader(false, 'collections');
    const overflow = screen.getByRole('button', { name: 'More destinations' });
    expect(overflow).not.toHaveAttribute('aria-current');
    expect(overflow.className).toMatch(/text-brand-accent/);
  });
});
