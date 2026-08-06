import { createContext, useContext } from 'react';

/**
 * The live measured height (px) of the fixed header/banner chrome in
 * AppLayout, or null before the first ResizeObserver measurement. Lets
 * descendant views (e.g. a sticky in-page header) align with the same
 * offset AppLayout's <main> already uses for its padding-top, instead of
 * duplicating the pre-measurement Tailwind fallback breakpoints and
 * silently drifting out of sync when the chrome's actual height changes
 * (e.g. a banner becoming visible).
 */
export const ChromeHeightContext = createContext<number | null>(null);

export function useChromeHeight(): number | null {
  return useContext(ChromeHeightContext);
}
