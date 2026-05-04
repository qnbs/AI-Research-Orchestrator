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
});
