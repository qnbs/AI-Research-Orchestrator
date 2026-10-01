import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../store/slices/settingsSlice';
import { normalizeAiSettingsAfterImport } from './settingsImport';

describe('normalizeAiSettingsAfterImport', () => {
  const openAiBefore = {
    ...defaultSettings.ai,
    provider: 'openai' as const,
    model: 'gpt-5',
  };

  it('preserves OpenAI model IDs when provider+model are imported', () => {
    const result = normalizeAiSettingsAfterImport(
      { ...openAiBefore, model: 'gpt-5-mini' },
      { provider: 'openai', model: 'gpt-5-mini' },
      openAiBefore,
    );
    expect(result.provider).toBe('openai');
    expect(result.model).toBe('gpt-5-mini');
  });

  it('keeps current provider/model on temperature-only partial import', () => {
    const merged = { ...openAiBefore, temperature: 0.5 };
    const result = normalizeAiSettingsAfterImport(merged, { temperature: 0.5 }, openAiBefore);
    expect(result.provider).toBe('openai');
    expect(result.model).toBe('gpt-5');
    expect(result.temperature).toBe(0.5);
  });

  it('defaults model when import explicitly switches provider without model', () => {
    const merged = { ...openAiBefore, provider: 'anthropic' as const };
    const result = normalizeAiSettingsAfterImport(merged, { provider: 'anthropic' }, openAiBefore);
    expect(result.provider).toBe('anthropic');
    expect(result.model).toBe('claude-sonnet-4-5');
  });

  it('preserves current model when import explicitly sets model to blank', () => {
    const merged = { ...openAiBefore, model: '' };
    const result = normalizeAiSettingsAfterImport(merged, { model: '' }, openAiBefore);
    expect(result.provider).toBe('openai');
    expect(result.model).toBe('gpt-5');
  });

  it('rejects unknown imported provider and keeps the active provider/model', () => {
    const result = normalizeAiSettingsAfterImport(
      { ...openAiBefore, provider: 'gemini' as const, model: 'custom-model' },
      { provider: 'unknown-vendor' as 'gemini', model: 'custom-model' },
      openAiBefore,
    );
    expect(result.provider).toBe('openai');
    expect(result.model).toBe('custom-model');
  });

  it('forces heuristic model to local', () => {
    const result = normalizeAiSettingsAfterImport(
      { ...openAiBefore, provider: 'heuristic' as const, model: 'custom' },
      { provider: 'heuristic', model: 'custom' },
      openAiBefore,
    );
    expect(result.model).toBe('local');
  });
});
