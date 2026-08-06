import { useEffect, useState, type RefObject } from 'react';

/**
 * Measures a DOM element's rendered height via ResizeObserver, re-measuring
 * whenever its content changes size (e.g. banners mounting/unmounting inside it).
 * Returns null until the first measurement lands, so callers can fall back to a
 * static estimate before JS has run.
 */
export function useElementHeight(ref: RefObject<HTMLElement | null>): number | null {
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    setHeight(node.getBoundingClientRect().height);

    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setHeight(entry.contentRect.height);
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);

  return height;
}
