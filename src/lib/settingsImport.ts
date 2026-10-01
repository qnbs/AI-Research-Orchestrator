import type { Settings } from '../types';
import { AI_PROVIDERS, getProviderMeta } from '../services/providers/provider';
import type { AIProviderSelection } from '../services/providers/types';

const KNOWN_PROVIDER_IDS = Object.keys(AI_PROVIDERS) as AIProviderSelection[];

export function isKnownAiProviderId(value: unknown): value is AIProviderSelection {
  return typeof value === 'string' && (KNOWN_PROVIDER_IDS as string[]).includes(value);
}

/**
 * Normalizes AI fields after `deepMerge(current, imported)` so partial imports
 * (e.g. temperature only) keep the active provider/model unless the import
 * explicitly changes provider or supplies a model id.
 */
export function normalizeAiSettingsAfterImport(
  merged: Settings['ai'],
  importedPartial: Partial<Settings['ai']>,
  beforeImport: Settings['ai'],
): Settings['ai'] {
  const providerInImport = importedPartial.provider;
  const modelInImport = importedPartial.model;

  let provider: AIProviderSelection =
    (isKnownAiProviderId(merged.provider) ? merged.provider : beforeImport.provider) ?? 'gemini';

  if (providerInImport !== undefined) {
    provider = isKnownAiProviderId(providerInImport)
      ? providerInImport
      : (beforeImport.provider ?? 'gemini');
  }

  let model = beforeImport.model;
  const modelExplicit =
    modelInImport !== undefined && typeof modelInImport === 'string' && modelInImport.trim() !== '';

  if (modelExplicit) {
    model = modelInImport.trim();
  } else if (
    providerInImport !== undefined &&
    isKnownAiProviderId(providerInImport) &&
    providerInImport !== beforeImport.provider
  ) {
    model = getProviderMeta(provider).defaultModel;
  }

  if (provider === 'heuristic') {
    model = 'local';
  }

  return { ...merged, provider, model };
}
