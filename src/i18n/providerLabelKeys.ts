import type { TranslationKey } from './translations';
import type { AIProviderSelection } from '../services/providers/types';

/** Shared Settings / status-line keys so provider labels cannot drift. */
export const PROVIDER_LABEL_KEYS: Record<AIProviderSelection, TranslationKey> = {
  gemini: 'settings.ai.provider_label.gemini',
  openai: 'settings.ai.provider_label.openai',
  anthropic: 'settings.ai.provider_label.anthropic',
  ollama: 'settings.ai.provider_label.ollama',
  heuristic: 'settings.ai.provider_label.heuristic',
};
