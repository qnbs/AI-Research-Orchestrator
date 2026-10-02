import { describe, expect, it } from 'vitest';
import { AI_PROVIDERS } from './provider';
import {
  MODEL_CATALOG_VERIFIED_AT,
  RETIRED_MODEL_IDS,
  curatedModelsForProvider,
} from './modelCatalog';
import type { AIProviderId } from './types';

const CLOUD_CURATED: AIProviderId[] = ['gemini', 'openai', 'anthropic'];

describe('modelCatalog', () => {
  it('records a verification date', () => {
    expect(MODEL_CATALOG_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('keeps retired IDs out of curated defaults and suggestions', () => {
    for (const provider of CLOUD_CURATED) {
      const { defaultModel, modelSuggestions } = curatedModelsForProvider(provider);
      expect(RETIRED_MODEL_IDS.has(defaultModel)).toBe(false);
      for (const id of modelSuggestions) {
        expect(RETIRED_MODEL_IDS.has(id)).toBe(false);
      }
    }
  });

  it('matches AI_PROVIDERS curated fields', () => {
    for (const provider of CLOUD_CURATED) {
      const catalog = curatedModelsForProvider(provider);
      const meta = AI_PROVIDERS[provider];
      expect(meta.defaultModel).toBe(catalog.defaultModel);
      expect(meta.modelSuggestions).toEqual([...catalog.modelSuggestions]);
    }
  });

  it('blocks known retired IDs from re-entering the blocklist test set', () => {
    expect(RETIRED_MODEL_IDS.has('claude-opus-4-1')).toBe(true);
    expect(RETIRED_MODEL_IDS.has('gemini-2.0-flash')).toBe(true);
  });
});
