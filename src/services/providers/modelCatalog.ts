import type { AIProviderId } from './types';

/** Last human/agent verification of curated lists (ISO date). */
export const MODEL_CATALOG_VERIFIED_AT = '2026-10-02';

/**
 * Models that must not appear in curated defaults or suggestion chips.
 * Sources: vendor retirement notices captured in the 2026-10-02 audit master prompt.
 */
export const RETIRED_MODEL_IDS: ReadonlySet<string> = new Set([
  'gemini-2.0-flash',
  'gemini-3-pro-preview',
  'claude-opus-4-1',
  'claude-sonnet-4',
]);

export function assertCuratedModelsActive(modelIds: readonly string[], context: string): void {
  for (const id of modelIds) {
    if (RETIRED_MODEL_IDS.has(id)) {
      throw new Error(`${context}: retired model "${id}" must not be curated`);
    }
  }
}

export const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash';

export const GEMINI_MODEL_SUGGESTIONS: readonly string[] = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.5-flash-lite',
];

export const ANTHROPIC_DEFAULT_MODEL = 'claude-sonnet-4-5';

export const ANTHROPIC_MODEL_SUGGESTIONS: readonly string[] = [
  'claude-sonnet-4-5',
  'claude-haiku-4-5',
];

export const OPENAI_DEFAULT_MODEL = 'gpt-5';

export const OPENAI_MODEL_SUGGESTIONS: readonly string[] = [
  'gpt-5',
  'gpt-5-mini',
  'gpt-4.1',
  'gpt-4.1-mini',
  'o3',
  'o4-mini',
];

export function curatedModelsForProvider(provider: AIProviderId): {
  defaultModel: string;
  modelSuggestions: readonly string[];
} {
  switch (provider) {
    case 'gemini':
      return { defaultModel: GEMINI_DEFAULT_MODEL, modelSuggestions: GEMINI_MODEL_SUGGESTIONS };
    case 'anthropic':
      return {
        defaultModel: ANTHROPIC_DEFAULT_MODEL,
        modelSuggestions: ANTHROPIC_MODEL_SUGGESTIONS,
      };
    case 'openai':
      return { defaultModel: OPENAI_DEFAULT_MODEL, modelSuggestions: OPENAI_MODEL_SUGGESTIONS };
    case 'ollama':
      return {
        defaultModel: 'llama3.1:8b',
        modelSuggestions: ['llama3.1:8b', 'llama3.3', 'qwen2.5:14b', 'mistral:7b'],
      };
    case 'heuristic':
      return { defaultModel: 'local', modelSuggestions: ['local'] };
    default: {
      const _exhaustive: never = provider;
      return _exhaustive;
    }
  }
}

assertCuratedModelsActive(GEMINI_MODEL_SUGGESTIONS, 'GEMINI_MODEL_SUGGESTIONS');
assertCuratedModelsActive([GEMINI_DEFAULT_MODEL], 'GEMINI_DEFAULT_MODEL');
assertCuratedModelsActive(ANTHROPIC_MODEL_SUGGESTIONS, 'ANTHROPIC_MODEL_SUGGESTIONS');
assertCuratedModelsActive([ANTHROPIC_DEFAULT_MODEL], 'ANTHROPIC_DEFAULT_MODEL');
