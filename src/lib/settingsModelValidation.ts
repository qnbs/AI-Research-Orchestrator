import { getProviderMeta } from '../services/providers/provider';
import type { AIProviderSelection } from '../services/providers/types';

export function isStoredModelValidForProvider(
  provider: AIProviderSelection,
  storedModel: unknown,
): boolean {
  const providerMeta = getProviderMeta(provider);
  if (typeof storedModel !== 'string' || storedModel.trim() === '') {
    return false;
  }
  const model = storedModel.trim();
  if (provider === 'heuristic') {
    return model === 'local';
  }
  if (provider === 'gemini') {
    return providerMeta.modelSuggestions.includes(model) || model === providerMeta.defaultModel;
  }
  return true;
}

export function resolveModelForProvider(provider: AIProviderSelection, candidate: string): string {
  const trimmed = candidate.trim();
  if (isStoredModelValidForProvider(provider, trimmed)) {
    return provider === 'heuristic' ? 'local' : trimmed;
  }
  return getProviderMeta(provider).defaultModel;
}
