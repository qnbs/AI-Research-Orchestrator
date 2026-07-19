import { AppError } from '../../lib/errors';
import type { AIProvider } from './provider';
import type { AIProviderId } from './types';

const providerCache = new Map<AIProviderId, AIProvider>();

/**
 * Lazily loads and caches a live AI provider implementation.
 *
 * SDK-backed providers are loaded via dynamic `import()` so their code and
 * dependencies become separate async chunks and do not bloat the initial
 * bundle. The heuristic adapter is local and has no external dependencies.
 */
export async function getProvider(id: AIProviderId): Promise<AIProvider> {
  const cached = providerCache.get(id);
  if (cached) return cached;

  let provider: AIProvider;
  switch (id) {
    case 'gemini': {
      const { createGeminiProvider } = await import('./gemini');
      provider = createGeminiProvider();
      break;
    }
    case 'openai': {
      const { createOpenAIProvider } = await import('./openai');
      provider = createOpenAIProvider();
      break;
    }
    case 'anthropic': {
      const { createAnthropicProvider } = await import('./anthropic');
      provider = createAnthropicProvider();
      break;
    }
    case 'ollama': {
      const { createOllamaProvider } = await import('./ollama');
      provider = createOllamaProvider();
      break;
    }
    case 'heuristic': {
      const { createHeuristicProvider } = await import('./heuristic');
      provider = createHeuristicProvider();
      break;
    }
    default: {
      throw new AppError({
        code: 'VALIDATION',
        message: `Unknown AI provider: ${String(id)}`,
        retryable: false,
      });
    }
  }

  providerCache.set(id, provider);
  return provider;
}

/** Clears cached provider instances. Called when keys/settings change or in tests. */
export function resetProviderInstances(): void {
  for (const provider of providerCache.values()) {
    provider.reset?.();
  }
  providerCache.clear();
}

/**
 * Resolves the active provider for a settings object.
 * 'heuristic' reaches the transport layer only when explicitly selected as a
 * provider; normally the facade's heuristic fork handles heuristic mode before
 * calling the provider.
 */
export async function getProviderForSettings(aiSettings: {
  provider?: AIProviderId | 'heuristic';
}): Promise<AIProvider> {
  const id = aiSettings.provider ?? 'gemini';
  return getProvider(id);
}
