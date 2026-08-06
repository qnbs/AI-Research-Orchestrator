import React from 'react';
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { LoadingIndicator } from './LoadingIndicator';
import settingsReducer, { defaultSettings } from '../store/slices/settingsSlice';

// jsdom does not implement scrollIntoView; PipelineTimeline's auto-scroll effect
// calls it. Installed/restored per suite (not module-level) so this shared
// jsdom prototype mutation never leaks into other test files.
const originalScrollIntoView = Element.prototype.scrollIntoView;
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});
afterAll(() => {
  Element.prototype.scrollIntoView = originalScrollIntoView;
});

const baseProps = {
  title: 'Orchestrator AI',
  phase: 'Phase 1: Generating queries...',
  phases: ['Phase 1: Generating queries...', 'Phase 2: Searching...'],
  phaseDetails: {},
};

function wrap(ui: React.ReactElement) {
  const store = configureStore({
    reducer: { settings: settingsReducer },
    preloadedState: { settings: { data: defaultSettings, isLoading: false } },
  });
  return render(<Provider store={store}>{ui}</Provider>);
}

describe('LoadingIndicator cancel control', () => {
  it('renders no cancel button when the cancel prop is not provided', () => {
    wrap(<LoadingIndicator {...baseProps} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders the caller-provided label and invokes onClick when clicked', () => {
    const onClick = vi.fn();
    // A caller-controlled label proves LoadingIndicator itself makes no
    // assumption about translation/locale - it just renders what it's given.
    wrap(<LoadingIndicator {...baseProps} cancel={{ label: 'Stop the thing', onClick }} />);

    const button = screen.getByRole('button', { name: 'Stop the thing' });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
