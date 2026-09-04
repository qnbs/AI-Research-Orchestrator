import { describe, it, expect } from 'vitest';
import { createHeuristicProvider, resolveHeuristicOperation } from './heuristic';
import { AI_PROVIDERS } from './provider';
import {
  heuristicProviderCapabilities,
  isHeuristicOperation,
  type HeuristicOperation,
} from './types';

describe('createHeuristicProvider', () => {
  it('returns deterministic fallback content without guessing prompt substrings', async () => {
    const provider = createHeuristicProvider();
    const response = await provider.generateContent({
      model: 'local',
      prompt: 'topic: diabetes mellitus',
      json: true,
    });
    const parsed = JSON.parse(response.text) as { heuristic: boolean; topic: string };
    expect(parsed.heuristic).toBe(true);
    expect(parsed.topic).toContain('diabetes');
  });

  it('does not dispatch on prompt words like summary, analysis, or related online', async () => {
    const provider = createHeuristicProvider();
    const response = await provider.generateContent({
      model: 'local',
      prompt: 'Please write a summary analysis of related online web search for aspirin',
    });
    const parsed = JSON.parse(response.text) as { heuristic?: boolean; summary?: string };
    expect(parsed.heuristic).toBe(true);
    expect(parsed.summary).toBeUndefined();
  });

  it.each([
    ['tldr', 'Aspirin reduces cardiovascular events in high-risk adults.'],
    ['related-online', 'topic: aspirin'],
    ['analysis', 'topic: aspirin cardiovascular prevention'],
    ['synthesis', 'topic: aspirin'],
  ] as const satisfies ReadonlyArray<readonly [HeuristicOperation, string]>)(
    'dispatches typed %s operation',
    async (operation, prompt) => {
      const provider = createHeuristicProvider();
      const response = await provider.generateContent({
        model: 'local',
        prompt,
        heuristicOperation: operation,
      });
      if (operation === 'tldr') {
        expect(response.text.toLowerCase()).toMatch(/aspirin|cardiovascular|heuristic/);
        expect(() => JSON.parse(response.text)).toThrow();
        return;
      }
      if (operation === 'synthesis') {
        expect(response.text).toContain('Heuristic synthesis');
        expect(response.text).toMatch(/BM25\+/);
        expect(response.text).toMatch(/relative 0–100/);
        expect(response.text).not.toMatch(/semantic rank/i);
        expect(() => JSON.parse(response.text)).toThrow();
        return;
      }
      const parsed = JSON.parse(response.text) as Record<string, unknown>;
      expect(parsed.heuristic).not.toBe(true);
      if (operation === 'related-online') {
        expect(parsed.summary).toEqual(expect.stringMatching(/Heuristic|live provider/i));
        expect(parsed.sources).toEqual([]);
      }
      if (operation === 'analysis') {
        expect(parsed.summary).toEqual(expect.stringMatching(/Heuristic/));
        expect(Array.isArray(parsed.keyFindings)).toBe(true);
      }
    },
  );

  it('streams synthesis chunks', async () => {
    const provider = createHeuristicProvider();
    const chunks: string[] = [];
    for await (const chunk of provider.generateContentStream({
      model: 'local',
      prompt: 'topic: cancer',
    })) {
      if (chunk.text) chunks.push(chunk.text);
    }
    const markdown = chunks.join('');
    expect(markdown).toContain('Heuristic synthesis');
    expect(markdown).toMatch(/BM25\+/);
    expect(markdown).toMatch(/relative 0–100/);
    expect(markdown).not.toMatch(/semantic rank/i);
  });

  it('creates a grounded chat session', async () => {
    const provider = createHeuristicProvider();
    const session = await provider.createChatSession({ model: 'local' });
    const chunks: string[] = [];
    for await (const chunk of await session.sendMessageStream({ message: 'What is this?' })) {
      if (chunk.text) chunks.push(chunk.text);
    }
    expect(chunks.join('')).toContain('Heuristic');
  });

  it('honors an already-aborted signal', async () => {
    const provider = createHeuristicProvider();
    const signal = AbortSignal.abort();
    await expect(
      provider.generateContent({ model: 'local', prompt: 'topic: x', signal }),
    ).rejects.toMatchObject({ code: 'STREAM_ABORTED' });
  });

  it('does not require an API key', () => {
    const provider = createHeuristicProvider();
    expect(provider.capabilities.requiresApiKey).toBe(false);
  });

  it('advertises the same capabilities as AI_PROVIDERS.heuristic', () => {
    const provider = createHeuristicProvider();
    expect(provider.capabilities).toEqual(heuristicProviderCapabilities());
    expect(AI_PROVIDERS.heuristic.capabilities).toEqual(provider.capabilities);
    expect(provider.capabilities.webGrounding).toBe(false);
    expect(provider.capabilities.jsonMode).toBe(false);
    expect(provider.capabilities.structuredOutput.jsonObjectMode).toBe(false);
    expect(provider.capabilities.structuredOutput.nativeJsonSchema).toBe(false);
    expect(provider.capabilities.supportsAbort).toBe(true);
    expect(provider.capabilities.supportsCustomBaseUrl).toBe(false);
  });
});

describe('resolveHeuristicOperation', () => {
  it('defaults missing or unknown values to fallback', () => {
    expect(resolveHeuristicOperation({ model: 'local', prompt: 'x' })).toBe('fallback');
    expect(
      resolveHeuristicOperation({
        model: 'local',
        prompt: 'x',
        heuristicOperation: 'tldr',
      }),
    ).toBe('tldr');
    expect(isHeuristicOperation('web-search')).toBe(false);
    expect(isHeuristicOperation('analysis')).toBe(true);
  });
});
