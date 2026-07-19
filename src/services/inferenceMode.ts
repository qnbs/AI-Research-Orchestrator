/**
 * Single source of truth for live Gemini vs local heuristic inference.
 * Mode is derived from API-key presence, network status, and optional user override.
 */

/** Active inference backend. */
export type InferenceMode = 'live' | 'heuristic';

/** Why the resolved mode was chosen (for UI badges / tooltips). */
export type InferenceModeReason = 'live' | 'force' | 'no_api_key' | 'offline';

export interface InferenceModeSnapshot {
  mode: InferenceMode;
  reason: InferenceModeReason;
  hasApiKey: boolean;
  isOnline: boolean;
  forceHeuristic: boolean;
  /** Currently selected provider (or 'heuristic'). */
  provider: import('./providers/types').AIProviderSelection;
}

export interface ResolveInferenceModeInput {
  /** User toggle from Settings → AI. */
  forceHeuristic: boolean;
  /** Whether the active provider's key is stored and decryptable. */
  hasApiKey: boolean;
  /** `navigator.onLine` (or injectable equivalent). */
  isOnline: boolean;
  /** Currently selected provider or heuristic mode. */
  provider?: import('./providers/types').AIProviderSelection;
}

/**
 * Pure resolver: force override wins, then missing key, then offline → heuristic;
 * otherwise live Gemini.
 */
export function resolveInferenceMode(input: ResolveInferenceModeInput): InferenceModeSnapshot {
  const { forceHeuristic, hasApiKey, isOnline } = input;
  const provider = input.provider ?? 'gemini';

  if (forceHeuristic || provider === 'heuristic') {
    return {
      mode: 'heuristic',
      reason: 'force',
      hasApiKey,
      isOnline,
      forceHeuristic,
      provider,
    };
  }
  if (!hasApiKey) {
    return {
      mode: 'heuristic',
      reason: 'no_api_key',
      hasApiKey,
      isOnline,
      forceHeuristic,
      provider,
    };
  }
  if (!isOnline) {
    return {
      mode: 'heuristic',
      reason: 'offline',
      hasApiKey,
      isOnline,
      forceHeuristic,
      provider,
    };
  }
  return {
    mode: 'live',
    reason: 'live',
    hasApiKey,
    isOnline,
    forceHeuristic,
    provider,
  };
}

/** Human-readable short English label for badges (prefer i18n keys in UI). */
export function inferenceModeBadgeLabel(snapshot: InferenceModeSnapshot): string {
  if (snapshot.mode === 'live') {
    const label = snapshot.provider === 'gemini' ? 'Gemini' : snapshot.provider;
    return `Live · ${label.charAt(0).toUpperCase() + label.slice(1)}`;
  }
  switch (snapshot.reason) {
    case 'force':
      return 'Heuristic · Forced';
    case 'offline':
      return 'Heuristic · Offline';
    case 'no_api_key':
      return 'Heuristic · No API key';
    default:
      return 'Heuristic mode';
  }
}

/** Translation key suffix for UI badges (`inference.badge.*`). */
export function inferenceModeBadgeKey(
  snapshot: InferenceModeSnapshot,
): 'live' | 'force' | 'offline' | 'no_key' | 'heuristic' {
  if (snapshot.mode === 'live') return 'live';
  switch (snapshot.reason) {
    case 'force':
      return 'force';
    case 'offline':
      return 'offline';
    case 'no_api_key':
      return 'no_key';
    default:
      return 'heuristic';
  }
}

/** True when cost estimator should show $0. */
export function isZeroCostMode(snapshot: InferenceModeSnapshot): boolean {
  return snapshot.mode === 'heuristic';
}
