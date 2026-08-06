import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useReducedMotion } from 'framer-motion';
import { LoadingIndicator } from './LoadingIndicator';
import settingsReducer, { defaultSettings } from '../store/slices/settingsSlice';

// framer-motion's useReducedMotion() caches its result via a module-level
// singleton on first call (see node_modules/framer-motion .../use-reduced-motion),
// so live-reassigning window.matchMedia per test doesn't reliably change what it
// returns. Mock the hook directly instead, keeping the real motion/AnimatePresence
// implementation so PipelineTimeline still renders actual DOM elements.
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return { ...actual, useReducedMotion: vi.fn() };
});

const mockedUseReducedMotion = vi.mocked(useReducedMotion);

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

describe('LoadingIndicator CyberneticSpinner reduced-motion', () => {
  it('renders the SVG SMIL rotation/pulse animations when reduced motion is not requested', () => {
    mockedUseReducedMotion.mockReturnValue(false);
    const { container } = wrap(<LoadingIndicator {...baseProps} />);

    expect(container.querySelectorAll('animateTransform')).toHaveLength(2);
    expect(container.querySelectorAll('animate')).toHaveLength(2);
  });

  it('omits the SVG SMIL rotation/pulse animations when reduced motion is requested', () => {
    // SVG SMIL animations (animateTransform/animate) are not covered by CSS
    // prefers-reduced-motion media queries or Framer Motion at all - they can
    // only be suppressed by not rendering them.
    mockedUseReducedMotion.mockReturnValue(true);
    const { container } = wrap(<LoadingIndicator {...baseProps} />);

    expect(container.querySelectorAll('animateTransform')).toHaveLength(0);
    expect(container.querySelectorAll('animate')).toHaveLength(0);
  });

  it('treats an unresolved (null) preference conservatively, same as reduced motion', () => {
    mockedUseReducedMotion.mockReturnValue(null);
    const { container } = wrap(<LoadingIndicator {...baseProps} />);

    expect(container.querySelectorAll('animateTransform')).toHaveLength(0);
    expect(container.querySelectorAll('animate')).toHaveLength(0);
  });
});
