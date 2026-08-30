import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../lib/errors';
import { startFakeProviderHttpServer } from './conformance/fakeProviderHttpServer';
import { createAnthropicProvider } from './anthropic';
import { createHeuristicProvider } from './heuristic';
import { createOllamaProvider } from './ollama';
import { createOpenAIProvider } from './openai';
import type { AIProvider } from './provider';

const { getProviderApiKey } = vi.hoisted(() => ({
  getProviderApiKey: vi.fn(),
}));

vi.mock('../apiKeyService', () => ({
  getProviderApiKey: (...args: unknown[]) => getProviderApiKey(...args),
}));

function asAppError(provider: AIProvider, error: unknown): AppError {
  return provider.mapError(error);
}

async function generateOrMap(
  provider: AIProvider,
  request: Parameters<AIProvider['generateContent']>[0],
): Promise<{ ok: true; text: string } | { ok: false; error: AppError }> {
  try {
    const response = await provider.generateContent(request);
    return { ok: true, text: response.text };
  } catch (error) {
    return { ok: false, error: asAppError(provider, error) };
  }
}

describe('provider HTTP conformance harness', () => {
  let server: Awaited<ReturnType<typeof startFakeProviderHttpServer>>;
  beforeAll(async () => {
    server = await startFakeProviderHttpServer();
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(() => {
    getProviderApiKey.mockReset();
    getProviderApiKey.mockImplementation(async (id: string) =>
      id === 'openai' || id === 'anthropic' ? 'sk-conformance-test' : '',
    );
    server.setScenario('ok');
  });

  afterEach(() => {
    createOpenAIProvider().reset?.();
    createAnthropicProvider().reset?.();
    createOllamaProvider().reset?.();
  });

  it('serves Ollama generate JSON on the fake origin', async () => {
    const response = await fetch(`${server.origin}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    expect(response.ok).toBe(true);
    await expect(response.json()).resolves.toMatchObject({ response: 'hello from ollama' });
  });

  describe.each([
    {
      id: 'ollama' as const,
      create: createOllamaProvider,
      baseURL: () => server.origin,
      model: 'llama3.1:8b',
      expectedText: 'hello from ollama',
      rateLimitCode: 'PROVIDER_UNAVAILABLE',
      rateLimitRetryable: false,
    },
    {
      id: 'openai' as const,
      create: createOpenAIProvider,
      baseURL: () => `${server.origin}/v1`,
      model: 'gpt-4.1-mini',
      expectedText: 'hello from openai',
      rateLimitCode: 'PROVIDER_RATE_LIMIT',
      rateLimitRetryable: true,
    },
    {
      id: 'anthropic' as const,
      create: createAnthropicProvider,
      baseURL: () => server.origin,
      model: 'claude-haiku-4-5',
      expectedText: 'hello from anthropic',
      rateLimitCode: 'PROVIDER_RATE_LIMIT',
      rateLimitRetryable: true,
    },
  ])(
    '$id generateContent contract',
    ({ create, baseURL, model, expectedText, rateLimitCode, rateLimitRetryable }) => {
      it('returns text on HTTP 200', async () => {
        const provider = create();
        const result = await generateOrMap(provider, {
          model,
          prompt: 'ping',
          baseURL: baseURL(),
        });
        expect(result).toEqual({ ok: true, text: expectedText });
      });

      it('maps HTTP 429 to the provider rate-limit contract', async () => {
        server.setScenario('rate-limit');
        const provider = create();
        const result = await generateOrMap(provider, {
          model,
          prompt: 'ping',
          baseURL: baseURL(),
        });
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.error.code).toBe(rateLimitCode);
        expect(result.error.retryable).toBe(rateLimitRetryable);
        expect(result.error.status).toBe(429);
      });

      it('maps HTTP 500 to retryable PROVIDER_UNAVAILABLE', async () => {
        server.setScenario('unavailable');
        const provider = create();
        const result = await generateOrMap(provider, {
          model,
          prompt: 'ping',
          baseURL: baseURL(),
        });
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.error.code).toBe('PROVIDER_UNAVAILABLE');
        expect(result.error.retryable).toBe(true);
        expect(result.error.status).toBe(500);
      });

      it('does not treat a malformed 200 body as successful text', async () => {
        server.setScenario('malformed');
        const provider = create();
        const result = await generateOrMap(provider, {
          model,
          prompt: 'ping',
          baseURL: baseURL(),
        });
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(['PROVIDER_PARSE_FAILURE', 'PROVIDER_UNAVAILABLE']).toContain(result.error.code);
      });

      it('does not mark caller abort as retryable', async () => {
        server.setScenario('hang');
        const provider = create();
        const controller = new AbortController();
        const pending = generateOrMap(provider, {
          model,
          prompt: 'ping',
          baseURL: baseURL(),
          signal: controller.signal,
        });
        await new Promise((resolve) => setTimeout(resolve, 40));
        controller.abort();
        const result = await pending;
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.error.retryable).toBe(false);
        expect(['STREAM_ABORTED', 'PROVIDER_UNAVAILABLE']).toContain(result.error.code);
      });
    },
  );

  describe('heuristic (no HTTP)', () => {
    it('returns deterministic text without touching the fake server', async () => {
      server.setScenario('unavailable');
      const provider = createHeuristicProvider();
      const result = await generateOrMap(provider, {
        model: 'local',
        prompt: 'topic: diabetes mellitus',
        json: true,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.text).toContain('heuristic');
      expect(provider.capabilities.requiresApiKey).toBe(false);
    });
  });
});
