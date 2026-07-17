import { useEffect } from 'react';
import type { Settings } from '../types';

const FONT_MAP: Record<string, string> = {
  Figtree: 'var(--font-sans)',
  Sora: 'var(--font-display)',
  'IBM Plex Sans': "'IBM Plex Sans', var(--font-sans)",
  'JetBrains Mono': 'var(--font-mono)',
  // Legacy persisted values map onto the new instrument stack
  Inter: 'var(--font-sans)',
  Lato: 'var(--font-sans)',
  Roboto: 'var(--font-sans)',
  'Open Sans': 'var(--font-sans)',
};

/**
 * Applies theme class, animation preference, density, font, and optional custom brand colors to the document.
 */
export function useDocumentAppearance(settings: Settings): void {
  useEffect(() => {
    document.documentElement.className = settings.theme;
    document.documentElement.classList.toggle(
      'no-animations',
      !settings.performance.enableAnimations,
    );
    document.documentElement.style.setProperty(
      '--space-density',
      settings.appearance.density === 'compact' ? '0.85' : '1',
    );

    const fontStack = FONT_MAP[settings.appearance.fontFamily] || FONT_MAP.Figtree;
    document.body.style.fontFamily = fontStack;
    document.documentElement.style.setProperty('--font-family', fontStack);

    if (settings.appearance.customColors.enabled) {
      document.documentElement.style.setProperty(
        '--color-brand-primary',
        settings.appearance.customColors.primary,
      );
      document.documentElement.style.setProperty(
        '--color-brand-secondary',
        settings.appearance.customColors.secondary,
      );
      document.documentElement.style.setProperty(
        '--color-brand-accent',
        settings.appearance.customColors.accent,
      );
    } else {
      document.documentElement.style.removeProperty('--color-brand-primary');
      document.documentElement.style.removeProperty('--color-brand-secondary');
      document.documentElement.style.removeProperty('--color-brand-accent');
    }
  }, [
    settings.theme,
    settings.performance.enableAnimations,
    settings.appearance.fontFamily,
    settings.appearance.density,
    settings.appearance.customColors,
  ]);
}
