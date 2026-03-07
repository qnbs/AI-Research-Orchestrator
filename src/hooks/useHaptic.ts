import { useCallback } from 'react';

/**
 * useHaptic — wraps the Web Vibration API for haptic feedback on mobile.
 * Silently no-ops on unsupported browsers / desktop.
 *
 * Preset patterns:
 *  - light  : 20ms  — navigation tap
 *  - medium : 50ms  — action confirmation
 *  - success: [30, 50, 100]  — save / complete
 *  - error  : [50, 30, 50, 30, 80]  — alert / error
 */
export type HapticPreset = 'light' | 'medium' | 'success' | 'error';

const PATTERNS: Record<HapticPreset, number | number[]> = {
  light:   20,
  medium:  50,
  success: [30, 50, 100],
  error:   [50, 30, 50, 30, 80],
};

export function useHaptic() {
  return useCallback((preset: HapticPreset = 'medium') => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(PATTERNS[preset]);
    }
  }, []);
}
