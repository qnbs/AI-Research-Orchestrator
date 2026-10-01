import type { Settings } from '../types';
import { AI_PROVIDERS, getProviderMeta } from '../services/providers/provider';
import type { AIProviderSelection } from '../services/providers/types';

const KNOWN_PROVIDER_IDS = Object.keys(AI_PROVIDERS) as AIProviderSelection[];

export function isKnownAiProviderId(value: unknown): value is AIProviderSelection {
  return typeof value === 'string' && (KNOWN_PROVIDER_IDS as string[]).includes(value);
}

export type SanitizedImportedAiFields = Pick<Settings['ai'], 'provider' | 'model'>;

/**
 * Normalizes AI fields from an imported settings JSON blob.
 * Preserves provider-specific free-text model IDs; only fills defaults when missing/invalid.
 */
export function sanitizeImportedAiSettings(
  ai: Partial<Settings['ai']> | undefined,
): SanitizedImportedAiFields | undefined {
  if (!ai) return undefined;

  const provider: AIProviderSelection = isKnownAiProviderId(ai.provider) ? ai.provider : 'gemini';
  const meta = getProviderMeta(provider);

  let model = ai.model;
  if (typeof model !== 'string' || model.trim() === '') {
    model = meta.defaultModel;
  } else {
    model = model.trim();
  }

  if (provider === 'heuristic') {
    model = 'local';
  }

  return {
    ...ai,
    provider,
    model,
  };
}
