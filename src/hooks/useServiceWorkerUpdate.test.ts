import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useServiceWorkerUpdate } from './useServiceWorkerUpdate';

function dispatchUpdateAvailable(registration: unknown) {
  window.dispatchEvent(new CustomEvent('sw-update-available', { detail: { registration } }));
}

function stubServiceWorker(getRegistration: () => Promise<unknown>) {
  Object.defineProperty(navigator, 'serviceWorker', {
    value: { getRegistration },
    configurable: true,
  });
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

  it('removes its sw-update-available listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useServiceWorkerUpdate());
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('sw-update-available', expect.any(Function));
    removeSpy.mockRestore();
  });

  describe('a worker already waiting before mount', () => {
    afterEach(() => {
      // @ts-expect-error - test-only cleanup of a property jsdom doesn't define by default
      delete navigator.serviceWorker;
    });

    it('recovers it via getRegistration() so a missed dispatch is not lost', async () => {
      stubServiceWorker(() => Promise.resolve({ waiting: { postMessage: vi.fn() } }));
      const { result } = renderHook(() => useServiceWorkerUpdate());
      await waitFor(() => expect(result.current.updateAvailable).toBe(true));
    });

    it('stays hidden when the registration has no waiting worker', async () => {
      stubServiceWorker(() => Promise.resolve({ waiting: null }));
      const { result } = renderHook(() => useServiceWorkerUpdate());
      await act(async () => {
        await Promise.resolve();
      });
      expect(result.current.updateAvailable).toBe(false);
    });

    it('stays hidden and does not throw when the lookup rejects', async () => {
      stubServiceWorker(() => Promise.reject(new Error('no service worker support')));
      const { result } = renderHook(() => useServiceWorkerUpdate());
      await act(async () => {
        await Promise.resolve();
      });
      expect(result.current.updateAvailable).toBe(false);
    });
  });
});
