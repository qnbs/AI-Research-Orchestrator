/** Canonical product branding tokens (PWA, UI, metadata). */
export const BRAND_EMOJI = '🔬';

export const BRAND_APP_NAME = 'AI Research Orchestration Author';
export const BRAND_SHORT_NAME = 'AI Research';
export const BRAND_THEME_COLOR = '#070b12';
export const BRAND_BACKGROUND_COLOR = '#070b12';

/** Relative paths from site root (GitHub Pages base path included in manifest). */
export const BRAND_ICON_PATHS = {
  svg: 'icons/app-icon.svg',
  png192: 'icons/icon-192.png',
  png512: 'icons/icon-512.png',
  maskable512: 'icons/maskable-512.png',
  appleTouch: 'icons/apple-touch-icon.png',
} as const;

/** Absolute OG/Twitter image URL for GitHub Pages deployment. */
export const BRAND_OG_IMAGE_URL =
  'https://qnbs.github.io/AI-Research-Orchestrator/icons/icon-512.png';

/** Gradient stops aligned with `src/index.css` dark theme tokens. */
export const BRAND_GRADIENT_STOPS = {
  start: '#14b8a6',
  mid: '#2dd4bf',
  end: '#38bdf8',
} as const;
