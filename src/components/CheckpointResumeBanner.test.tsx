import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { CheckpointResumeBanner } from './CheckpointResumeBanner';
import { createResearchCheckpoint } from '../lib/researchCheckpoint';
import type { ResearchInput } from '../types';
import settingsReducer, { defaultSettings } from '../store/slices/settingsSlice';

const input: ResearchInput = {
  researchTopic: 'Immunotherapy',
  dateRange: 'any',
  articleTypes: [],
  synthesisFocus: 'overview',
  maxArticlesToScan: 10,
  topNToSynthesize: 3,
};

function wrap(ui: React.ReactElement) {
  const store = configureStore({
    reducer: { settings: settingsReducer },
    preloadedState: {
      settings: { data: defaultSettings, isLoading: false },
    },
  });
  return render(<Provider store={store}>{ui}</Provider>);
}

describe('CheckpointResumeBanner', () => {
  it('renders nothing when no resumable checkpoints', () => {
    const empty = createResearchCheckpoint({ input, phase: 'p', reason: 'abort', now: 1 });
    const { container } = wrap(
      <CheckpointResumeBanner
        checkpoints={[empty]}
        onRestore={vi.fn()}
        onRerun={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows restore / rerun / discard actions', () => {
    const ckpt = createResearchCheckpoint({
      input,
      phase: 'Phase 4',
      reason: 'error',
      synthesisSoFar: 'partial text',
      now: Date.now() - 60_000,
    });
    const onRestore = vi.fn();
    const onRerun = vi.fn();
    const onDiscard = vi.fn();
    wrap(
      <CheckpointResumeBanner
        checkpoints={[ckpt]}
        onRestore={onRestore}
        onRerun={onRerun}
        onDiscard={onDiscard}
      />,
    );

    expect(screen.getByText(/Immunotherapy/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Restore partial/i }));
    expect(onRestore).toHaveBeenCalledWith(ckpt);
    fireEvent.click(screen.getByRole('button', { name: /Re-run from start/i }));
    expect(onRerun).toHaveBeenCalledWith(ckpt);
    fireEvent.click(screen.getByRole('button', { name: /Discard/i }));
    expect(onDiscard).toHaveBeenCalledWith(ckpt.id);
  });
});
