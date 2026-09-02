/**
 * Shared sticky offset for sidebars sitting below the app chrome.
 * Desktop-only (`md:`): on a one-column mobile layout a sticky sidebar overlaps
 * the form and intercepts taps next to the fixed bottom nav.
 * `top` uses measured `--chrome-height` (banners) with a 6rem floor.
 */
export const STICKY_BELOW_CHROME_CLASS = 'md:sticky md:top-[max(6rem,var(--chrome-height,0px))]';
