import { describe, it, expect } from 'vitest';
import { createOpenAIProvider } from './openai';
import { createAnthropicProvider } from './anthropic';
import { createGeminiProvider } from './gemini';
import { createOllamaProvider } from './ollama';
import { createHeuristicProvider } from './heuristic';
import { AI_PROVIDERS } from './provider';

const providers = [
  createGeminiProvider(),
  createOpenAIProvider(),
  createAnthropicProvider(),
  createOllamaProvider(),
  createHeuristicProvider(),
];

describe('provider capability contract', () => {
  it.each(providers.map((p) => [p.id, p] as const))(
    '%s exposes structured output capability flags',
    (_id, provider) => {
      expect(provider.capabilities.structuredOutput).toBeDefined();
      expect(typeof provider.capabilities.structuredOutput.jsonObjectMode).toBe('boolean');
      expect(typeof provider.capabilities.structuredOutput.nativeJsonSchema).toBe('boolean');
      expect(provider.capabilities.supportsAbort).toBe(true);
    },
  );

  it('documents Gemini native JSON schema support', () => {
    expect(createGeminiProvider().capabilities.structuredOutput.nativeJsonSchema).toBe(true);
  });

  it('documents OpenAI JSON object mode without native schema enforcement', () => {
    const caps = createOpenAIProvider().capabilities.structuredOutput;
    expect(caps.jsonObjectMode).toBe(true);
    expect(caps.nativeJsonSchema).toBe(false);
  });

  it('documents heuristic as local-only without JSON schema or web grounding', () => {
    const caps = createHeuristicProvider().capabilities;
    expect(caps.webGrounding).toBe(false);
    expect(caps.jsonMode).toBe(false);
    expect(caps.structuredOutput.jsonObjectMode).toBe(false);
    expect(caps.structuredOutput.nativeJsonSchema).toBe(false);
    expect(caps.requiresApiKey).toBe(false);
    expect(AI_PROVIDERS.heuristic.capabilities).toEqual(caps);
  });
});
