import { describe, expect, it } from 'vitest';
import { sanitizeImportedAiSettings } from './settingsImport';

describe('sanitizeImportedAiSettings', () => {
  it('preserves OpenAI model IDs on import (no Gemini coercion)', () => {
    const result = sanitizeImportedAiSettings({
      provider: 'openai',
      model: 'gpt-5',
    });
    expect(result?.provider).toBe('openai');
    expect(result?.model).toBe('gpt-5');
  });

  it('preserves Anthropic and Ollama model IDs', () => {
    expect(
      sanitizeImportedAiSettings({ provider: 'anthropic', model: 'claude-sonnet-4-5' })?.model,
    ).toBe('claude-sonnet-4-5');
    expect(sanitizeImportedAiSettings({ provider: 'ollama', model: 'qwen2.5:14b' })?.model).toBe(
      'qwen2.5:14b',
    );
  });

  it('fills default model when missing for the selected provider', () => {
    expect(sanitizeImportedAiSettings({ provider: 'openai', model: '' })?.model).toBe('gpt-5');
    expect(sanitizeImportedAiSettings({ provider: 'gemini' })?.model).toBe('gemini-2.5-flash');
  });

  it('resets unknown provider to gemini defaults', () => {
    const result = sanitizeImportedAiSettings({
      provider: 'unknown-vendor' as 'gemini',
      model: 'some-model',
    });
    expect(result?.provider).toBe('gemini');
    expect(result?.model).toBe('some-model');
  });

  it('forces heuristic model to local', () => {
    const result = sanitizeImportedAiSettings({
      provider: 'heuristic',
      model: 'custom',
    });
    expect(result?.model).toBe('local');
  });

  it('trims whitespace from model ids', () => {
    expect(sanitizeImportedAiSettings({ provider: 'openai', model: '  gpt-5-mini  ' })?.model).toBe(
      'gpt-5-mini',
    );
  });
});
