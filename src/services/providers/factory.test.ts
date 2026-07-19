import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getProvider, resetProviderInstances, getProviderForSettings } from './factory';
import { resetAIInstance } from '../geminiService';

vi.mock('../apiKeyService', () => ({
  getProviderApiKey: vi.fn().mockResolvedValue('fake-key'),
  hasProviderApiKey: vi.fn().mockResolvedValue(true),
  saveProviderApiKey: vi.fn().mockResolvedValue(undefined),
  removeProviderApiKey: vi.fn().mockResolvedValue(undefined),
  validateApiKeyFormat: vi.fn().mockReturnValue(true),
  getNcbiApiKey: vi.fn().mockResolvedValue(null),
  hasNcbiApiKey: vi.fn().mockResolvedValue(false),
  saveNcbiApiKey: vi.fn().mockResolvedValue(undefined),
  removeNcbiApiKey: vi.fn().mockResolvedValue(undefined),
}));

describe('provider factory', () => {
  beforeEach(() => {
    resetProviderInstances();
    resetAIInstance();
  });

  it('returns a gemini provider', async () => {
    const provider = await getProvider('gemini');
    expect(provider.id).toBe('gemini');
    expect(provider.capabilities.streaming).toBe(true);
  });

  it('returns an openai provider', async () => {
    const provider = await getProvider('openai');
    expect(provider.id).toBe('openai');
    expect(provider.capabilities.requiresApiKey).toBe(true);
  });

  it('returns an anthropic provider', async () => {
    const provider = await getProvider('anthropic');
    expect(provider.id).toBe('anthropic');
    expect(provider.capabilities.chat).toBe(true);
  });

  it('returns an ollama provider', async () => {
    const provider = await getProvider('ollama');
    expect(provider.id).toBe('ollama');
    expect(provider.capabilities.requiresApiKey).toBe(false);
  });

  it('returns a heuristic provider', async () => {
    const provider = await getProvider('heuristic');
    expect(provider.id).toBe('heuristic');
    expect(provider.capabilities.requiresApiKey).toBe(false);
  });

  it('caches provider instances', async () => {
    const first = await getProvider('gemini');
    const second = await getProvider('gemini');
    expect(first).toBe(second);
  });

  it('resolves provider from settings', async () => {
    const provider = await getProviderForSettings({ provider: 'openai' });
    expect(provider.id).toBe('openai');
  });

  it('defaults to gemini when provider is missing', async () => {
    const provider = await getProviderForSettings({});
    expect(provider.id).toBe('gemini');
  });
});
