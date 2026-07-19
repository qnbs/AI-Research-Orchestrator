import { describe, it, expect } from 'vitest';
import { createHeuristicProvider } from './heuristic';

describe('createHeuristicProvider', () => {
  it('returns deterministic content', async () => {
    const provider = createHeuristicProvider();
    const response = await provider.generateContent({
      model: 'local',
      prompt: 'topic: diabetes mellitus',
      json: true,
    });
    expect(response.text).toContain('heuristic');
    expect(JSON.parse(response.text)).toHaveProperty('topic');
  });

  it('streams synthesis chunks', async () => {
    const provider = createHeuristicProvider();
    const chunks: string[] = [];
    for await (const chunk of provider.generateContentStream({
      model: 'local',
      prompt: 'topic: cancer',
    })) {
      if (chunk.text) chunks.push(chunk.text);
    }
    expect(chunks.join('')).toContain('Heuristic synthesis');
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

  it('does not require an API key', () => {
    const provider = createHeuristicProvider();
    expect(provider.capabilities.requiresApiKey).toBe(false);
  });
});
