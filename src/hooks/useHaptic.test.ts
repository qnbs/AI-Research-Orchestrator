import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useHaptic } from './useHaptic';

describe('useHaptic', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls navigator.vibrate when supported', () => {
    const vibrate = vi.fn();
    vi.stubGlobal('navigator', { ...navigator, vibrate });
    const { result } = renderHook(() => useHaptic());
    result.current('light');
    expect(vibrate).toHaveBeenCalledWith(20);
  });

  it('no-ops when vibrate missing', () => {
    vi.stubGlobal('navigator', {
      userAgent: navigator.userAgent,
    } as Navigator);
    const { result } = renderHook(() => useHaptic());
    expect(() => result.current('success')).not.toThrow();
  });
});
