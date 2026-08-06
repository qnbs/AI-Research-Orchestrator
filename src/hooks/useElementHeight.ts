import { useCallback, useEffect, useState, type RefCallback } from 'react';

/**
 * Measures a DOM element's rendered (border-box) height via ResizeObserver,
 * re-measuring whenever its content changes size (e.g. banners mounting/
 * unmounting inside it). Returns a callback ref (rather than accepting a
 * `useRef` object) so measurement setup re-runs when the element itself
 * actually attaches/detaches - a plain `RefObject` dependency would only run
 * once, on the *hook's* mount, which can be before the element exists (e.g.
 * while a parent is still showing a loading/onboarding screen), permanently
 * missing it. Returns null until the first measurement lands, so callers can
 * fall back to a static estimate before JS has run.
 */
export function useElementHeight<T extends HTMLElement>(): [RefCallback<T>, number | null] {
  const [node, setNode] = useState<T | null>(null);
  const [height, setHeight] = useState<number | null>(null);

  const ref = useCallback<RefCallback<T>>((el) => {
    setNode(el);
    if (!el) {
      // On detach there's no future re-measurement to correct a stale value -
      // the effect below only re-measures when a (non-null) node is present.
      setHeight(null);
    }
  }, []);

  useEffect(() => {
    if (!node) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizing with an external system (ResizeObserver's own initial state is only knowable once observe() has been called, so the first reading must happen here, before the async callback can fire).
    setHeight(node.getBoundingClientRect().height);

    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        // contentRect excludes padding/border; measure the real border-box
        // footprint (what layout siblings actually need to clear) instead.
        setHeight(entry.target.getBoundingClientRect().height);
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

  return [ref, height];
}
