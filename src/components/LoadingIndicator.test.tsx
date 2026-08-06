import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { LoadingIndicator } from './LoadingIndicator';
import settingsReducer, { defaultSettings } from '../store/slices/settingsSlice';

// jsdom does not implement scrollIntoView; PipelineTimeline's auto-scroll effect calls it.
Element.prototype.scrollIntoView = vi.fn();

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
  it('renders no cancel button when onCancel is not provided', () => {
    wrap(<LoadingIndicator {...baseProps} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders a cancel button and invokes onCancel when clicked', () => {
    const onCancel = vi.fn();
    wrap(<LoadingIndicator {...baseProps} onCancel={onCancel} />);

    const button = screen.getByRole('button', { name: 'Cancel research' });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
