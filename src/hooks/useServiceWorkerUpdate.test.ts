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

  it('dispatches sw-request-reload instead of posting to the worker directly on reload()', () => {
    // register-sw.js owns the actual postMessage/controllerchange mechanics -
    // see its own comment on why a direct postMessage here would bypass the
    // guard against reloading on a page's first, uncontrolled -> controlled
    // transition, not only a genuine update.
    const onRequestReload = vi.fn();
    window.addEventListener('sw-request-reload', onRequestReload);
    const { result } = renderHook(() => useServiceWorkerUpdate());
    act(() => {
      dispatchUpdateAvailable({ waiting: { postMessage: vi.fn() } });
    });
    act(() => {
      result.current.reload();
    });
    expect(onRequestReload).toHaveBeenCalledTimes(1);
    window.removeEventListener('sw-request-reload', onRequestReload);
  });

  it('does nothing if reload() is called before any update is available', () => {
    const onRequestReload = vi.fn();
    window.addEventListener('sw-request-reload', onRequestReload);
    const { result } = renderHook(() => useServiceWorkerUpdate());
    expect(() => result.current.reload()).not.toThrow();
    expect(onRequestReload).not.toHaveBeenCalled();
    window.removeEventListener('sw-request-reload', onRequestReload);
  });

  it('ignores an event with no registration in its detail', () => {
    const { result } = renderHook(() => useServiceWorkerUpdate());
    act(() => {
      window.dispatchEvent(new CustomEvent('sw-update-available', { detail: {} }));
    });
    expect(result.current.updateAvailable).toBe(false);
  });
});
