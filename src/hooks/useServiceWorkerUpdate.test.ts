import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useServiceWorkerUpdate } from './useServiceWorkerUpdate';

function dispatchUpdateAvailable(registration: unknown) {
  window.dispatchEvent(new CustomEvent('sw-update-available', { detail: { registration } }));
}

describe('useServiceWorkerUpdate', () => {
  it('starts with no update available', () => {
    const { result } = renderHook(() => useServiceWorkerUpdate());
    expect(result.current.updateAvailable).toBe(false);
  });

  it('reports an update once sw-update-available fires', () => {
    const { result } = renderHook(() => useServiceWorkerUpdate());
    act(() => {
      dispatchUpdateAvailable({ waiting: { postMessage: vi.fn() } });
    });
    expect(result.current.updateAvailable).toBe(true);
  });

  it('posts SKIP_WAITING to the waiting worker on reload()', () => {
    const postMessage = vi.fn();
    const { result } = renderHook(() => useServiceWorkerUpdate());
    act(() => {
      dispatchUpdateAvailable({ waiting: { postMessage } });
    });
    act(() => {
      result.current.reload();
    });
    expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  });

  it('does nothing if reload() is called before any update is available', () => {
    const { result } = renderHook(() => useServiceWorkerUpdate());
    expect(() => result.current.reload()).not.toThrow();
  });

  it('ignores an event with no registration in its detail', () => {
    const { result } = renderHook(() => useServiceWorkerUpdate());
    act(() => {
      window.dispatchEvent(new CustomEvent('sw-update-available', { detail: {} }));
    });
    expect(result.current.updateAvailable).toBe(false);
  });
});
