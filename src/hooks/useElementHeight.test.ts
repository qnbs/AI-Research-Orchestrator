import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useElementHeight } from './useElementHeight';

type ResizeCallback = (entries: Array<{ target: Element }>) => void;

function stubResizeObserver() {
  let capturedCallback: ResizeCallback | null = null;
  const observe = vi.fn();
  const disconnect = vi.fn();

  class FakeResizeObserver {
    constructor(callback: ResizeCallback) {
      capturedCallback = callback;
    }
    observe = observe;
    unobserve = vi.fn();
    disconnect = disconnect;
  }

  vi.stubGlobal('ResizeObserver', FakeResizeObserver);

  return {
    observe,
    disconnect,
    fireResize: (target: Element) => {
      capturedCallback?.([{ target }]);
    },
  };
}

describe('useElementHeight', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns null before the ref callback attaches a node', () => {
    stubResizeObserver();
    const { result } = renderHook(() => useElementHeight());
    expect(result.current[1]).toBeNull();
  });

  it('measures via getBoundingClientRect once the ref callback attaches a node', () => {
    stubResizeObserver();
    const node = document.createElement('div');
    vi.spyOn(node, 'getBoundingClientRect').mockReturnValue({ height: 144 } as DOMRect);

    const { result } = renderHook(() => useElementHeight());
    act(() => {
      result.current[0](node);
    });

    expect(result.current[1]).toBe(144);
  });

  it('re-measures via getBoundingClientRect when ResizeObserver fires (ignores contentRect)', () => {
    const { fireResize } = stubResizeObserver();
    const node = document.createElement('div');
    const rectSpy = vi
      .spyOn(node, 'getBoundingClientRect')
      .mockReturnValueOnce({ height: 80 } as DOMRect)
      .mockReturnValueOnce({ height: 216 } as DOMRect);

    const { result } = renderHook(() => useElementHeight());
    act(() => {
      result.current[0](node);
    });
    expect(result.current[1]).toBe(80);

    act(() => {
      // Entry deliberately omits contentRect - the hook must not depend on it,
      // only on re-reading getBoundingClientRect (border-box) from the target.
      fireResize(node);
    });

    expect(rectSpy).toHaveBeenCalledTimes(2);
    expect(result.current[1]).toBe(216);
  });

  it('starts measuring once the node attaches, even if that happens on a later render (late attachment)', () => {
    stubResizeObserver();
    const node = document.createElement('div');
    vi.spyOn(node, 'getBoundingClientRect').mockReturnValue({ height: 64 } as DOMRect);

    // Simulates AppLayout: useElementHeight() is called on an early render while
    // a loading/onboarding screen is shown (no element to attach yet), then the
    // real chrome mounts on a later render and the ref callback fires then.
    const { result } = renderHook(() => useElementHeight());
    expect(result.current[1]).toBeNull();

    act(() => {
      result.current[0](node);
    });

    expect(result.current[1]).toBe(64);
  });

  it('clears the cached height on detach instead of returning a stale value', () => {
    stubResizeObserver();
    const node = document.createElement('div');
    vi.spyOn(node, 'getBoundingClientRect').mockReturnValue({ height: 144 } as DOMRect);

    const { result } = renderHook(() => useElementHeight());
    act(() => {
      result.current[0](node);
    });
    expect(result.current[1]).toBe(144);

    act(() => {
      // Element unmounts (e.g. AppLayout falls back to a loading screen again).
      // There is no future ResizeObserver callback to correct a stale value
      // once detached, so the ref callback itself must reset it.
      result.current[0](null);
    });

    expect(result.current[1]).toBeNull();
  });

  it('re-measures correctly after a detach + re-attach cycle', () => {
    stubResizeObserver();
    const nodeA = document.createElement('div');
    vi.spyOn(nodeA, 'getBoundingClientRect').mockReturnValue({ height: 144 } as DOMRect);
    const nodeB = document.createElement('div');
    vi.spyOn(nodeB, 'getBoundingClientRect').mockReturnValue({ height: 96 } as DOMRect);

    const { result } = renderHook(() => useElementHeight());
    act(() => {
      result.current[0](nodeA);
    });
    expect(result.current[1]).toBe(144);

    act(() => {
      result.current[0](null);
    });
    expect(result.current[1]).toBeNull();

    act(() => {
      result.current[0](nodeB);
    });
    expect(result.current[1]).toBe(96);
  });

  it('observes the node and disconnects on unmount', () => {
    const { observe, disconnect } = stubResizeObserver();
    const node = document.createElement('div');

    const { result, unmount } = renderHook(() => useElementHeight());
    act(() => {
      result.current[0](node);
    });
    expect(observe).toHaveBeenCalledWith(node);

    unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it('falls back to a single measurement when ResizeObserver is unavailable', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const node = document.createElement('div');
    vi.spyOn(node, 'getBoundingClientRect').mockReturnValue({ height: 64 } as DOMRect);

    const { result } = renderHook(() => useElementHeight());
    act(() => {
      result.current[0](node);
    });

    expect(result.current[1]).toBe(64);
  });
});
