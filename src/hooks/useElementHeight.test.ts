import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useElementHeight } from './useElementHeight';

type ResizeCallback = (entries: Array<{ contentRect: { height: number } }>) => void;

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
    fireResize: (height: number) => {
      capturedCallback?.([{ contentRect: { height } }]);
    },
  };
}

describe('useElementHeight', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns null before a ref is attached', () => {
    stubResizeObserver();
    const ref = { current: null };
    const { result } = renderHook(() => useElementHeight(ref));
    expect(result.current).toBeNull();
  });

  it('measures the initial height once the ref points to a node', () => {
    stubResizeObserver();
    const node = document.createElement('div');
    vi.spyOn(node, 'getBoundingClientRect').mockReturnValue({ height: 144 } as DOMRect);
    const ref = { current: node };

    const { result } = renderHook(() => useElementHeight(ref));

    expect(result.current).toBe(144);
  });

  it('updates when ResizeObserver reports a new height', () => {
    const { fireResize } = stubResizeObserver();
    const node = document.createElement('div');
    vi.spyOn(node, 'getBoundingClientRect').mockReturnValue({ height: 80 } as DOMRect);
    const ref = { current: node };

    const { result } = renderHook(() => useElementHeight(ref));
    expect(result.current).toBe(80);

    act(() => {
      fireResize(216);
    });

    expect(result.current).toBe(216);
  });

  it('observes the node and disconnects on unmount', () => {
    const { observe, disconnect } = stubResizeObserver();
    const node = document.createElement('div');
    const ref = { current: node };

    const { unmount } = renderHook(() => useElementHeight(ref));
    expect(observe).toHaveBeenCalledWith(node);

    unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it('falls back to a single measurement when ResizeObserver is unavailable', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const node = document.createElement('div');
    vi.spyOn(node, 'getBoundingClientRect').mockReturnValue({ height: 64 } as DOMRect);
    const ref = { current: node };

    const { result } = renderHook(() => useElementHeight(ref));

    expect(result.current).toBe(64);
  });
});
