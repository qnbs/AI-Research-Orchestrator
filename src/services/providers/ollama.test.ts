import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createOllamaProvider } from './ollama';

describe('createOllamaProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('generates content', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: '{"answer": 42}' }),
    });

    const provider = createOllamaProvider();
    const response = await provider.generateContent({
      model: 'llama3.1:8b',
      prompt: 'hello',
      json: true,
      baseURL: 'http://localhost:11434',
    });

    expect(response.text).toBe('{"answer": 42}');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/generate',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"format":"json"'),
      }),
    );
  });

  it('streams content', async () => {
    const encoder = new TextEncoder();
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      body: {
        getReader: () => {
          const chunks = [
            JSON.stringify({ response: 'hi' }),
            JSON.stringify({ response: ' there' }),
          ];
          let i = 0;
          return {
            read: async () => {
              if (i >= chunks.length) return { done: true, value: undefined };
              return { done: false, value: encoder.encode(chunks[i++] + '\n') };
            },
          };
        },
      },
    });

    const provider = createOllamaProvider();
    const chunks: string[] = [];
    for await (const chunk of provider.generateContentStream({
      model: 'llama3.1:8b',
      prompt: 'hello',
    })) {
      if (chunk.text) chunks.push(chunk.text);
    }
    expect(chunks).toEqual(['hi', ' there']);
  });

  it('maps HTTP errors to AppError', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    const provider = createOllamaProvider();
    await expect(
      provider.generateContent({ model: 'llama3.1:8b', prompt: 'x' }),
    ).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE',
      status: 500,
    });
  });

  it('respects abort signal', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'));

    const provider = createOllamaProvider();
    const controller = new AbortController();
    controller.abort();
    await expect(
      provider.generateContent({ model: 'llama3.1:8b', prompt: 'x', signal: controller.signal }),
    ).rejects.toBeInstanceOf(DOMException);
  });
});
