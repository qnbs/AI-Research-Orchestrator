import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUrlSync } from './useUrlSync';
import type { View } from '../types/ui';

describe('useUrlSync', () => {
  const originalHash = window.location.hash;

  beforeEach(() => {
    window.history.replaceState(null, '', '#');
  });

  afterEach(() => {
    window.history.replaceState(null, '', originalHash || '#');
    vi.restoreAllMocks();
  });

  it('calls setCurrentView when hash matches a view', () => {
    const setCurrentView = vi.fn();
    window.location.hash = '#settings';
    renderHook(() => useUrlSync('home', setCurrentView));
    expect(setCurrentView).toHaveBeenCalledWith('settings' as View);
  });

  it('updates hash when currentView changes', () => {
    const setCurrentView = vi.fn();
    const { rerender } = renderHook(({ view }) => useUrlSync(view, setCurrentView), {
      initialProps: { view: 'home' as View },
    });
    act(() => rerender({ view: 'dashboard' as View }));
    expect(window.location.hash).toContain('dashboard');
  });

  it('recognizes #collections as a valid view', () => {
    const setCurrentView = vi.fn();
    window.location.hash = '#collections';
    renderHook(() => useUrlSync('home', setCurrentView));
    expect(setCurrentView).toHaveBeenCalledWith('collections' as View);
  });

  it('does not push a spurious history entry on a deep-linked initial mount', () => {
    // Regression: the hook is initialized with currentView='home' (the Redux
    // default, before the hash->state effect's setCurrentView('collections')
    // dispatch has taken effect) while the URL already reads #collections. The
    // state->hash effect must not race that dispatch and push '#home' first -
    // that would insert a spurious history entry, breaking Back navigation.
    const pushStateSpy = vi.spyOn(window.history, 'pushState');
    window.location.hash = '#collections';

    renderHook(() => useUrlSync('home', vi.fn()));

    expect(pushStateSpy).not.toHaveBeenCalledWith(null, '', '#home');
  });

  it('does not treat unknown hashes as views', () => {
    const setCurrentView = vi.fn();
    window.location.hash = '#not-a-view';
    renderHook(() => useUrlSync('home', setCurrentView));
    expect(setCurrentView).not.toHaveBeenCalled();
  });
});
