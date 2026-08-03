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

  it('defaults to localhost and prefixes system prompt', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: 'ok' }),
    });
    const provider = createOllamaProvider();
    await provider.generateContent({
      model: 'llama3.1:8b',
      prompt: 'user',
      system: 'sys',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/generate',
      expect.objectContaining({
        body: expect.stringContaining('"prompt":"sys\\n\\nuser"'),
      }),
    );
  });

  it('maps 401 to PROVIDER_AUTH and strips trailing slash from baseURL', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'unauthorized',
    });
    const provider = createOllamaProvider();
    await expect(
      provider.generateContent({
        model: 'llama3.1:8b',
        prompt: 'x',
        baseURL: 'http://localhost:11434/',
      }),
    ).rejects.toMatchObject({ code: 'PROVIDER_AUTH', status: 401 });
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/generate',
      expect.anything(),
    );
  });

  it('mapError wraps unknown failures as PROVIDER_UNAVAILABLE', () => {
    const provider = createOllamaProvider();
    expect(provider.mapError(new Error('down')).code).toBe('PROVIDER_UNAVAILABLE');
    expect(provider.mapError(new Error('down')).message).toMatch(/Ollama error/);
    expect(provider.mapError('weird').retryable).toBe(true);
  });

  it('ignores malformed NDJSON lines while streaming', async () => {
    const encoder = new TextEncoder();
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      body: {
        getReader: () => {
          const chunks = ['not-json\n', JSON.stringify({ response: 'ok' }) + '\n'];
          let i = 0;
          return {
            read: async () => {
              if (i >= chunks.length) return { done: true, value: undefined };
              return { done: false, value: encoder.encode(chunks[i++]) };
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
    expect(chunks).toEqual(['ok']);
  });

  it('creates a chat session against /api/chat', async () => {
    const encoder = new TextEncoder();
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      body: {
        getReader: () => {
          const payload = JSON.stringify({ message: { content: 'chat-ok' } }) + '\n';
          let done = false;
          return {
            read: async () => {
              if (done) return { done: true, value: undefined };
              done = true;
              return { done: false, value: encoder.encode(payload) };
            },
          };
        },
      },
    });
    const provider = createOllamaProvider();
    const session = await provider.createChatSession({
      model: 'llama3.1:8b',
      history: [{ role: 'model', text: 'prior' }],
      baseURL: 'http://127.0.0.1:11434',
    });
    const chunks: string[] = [];
    for await (const chunk of await session.sendMessageStream({ message: 'hi' })) {
      if (chunk.text) chunks.push(chunk.text);
    }
    expect(chunks).toEqual(['chat-ok']);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:11434/api/chat',
      expect.objectContaining({
        body: expect.stringContaining('"role":"assistant"'),
      }),
    );
  });

  it('testConnection checks /api/tags', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: true });
    const provider = createOllamaProvider();
    await expect(provider.testConnection!('http://localhost:11434')).resolves.toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/tags',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('exposes requiresApiKey=false capability', () => {
    const provider = createOllamaProvider();
    expect(provider.capabilities.requiresApiKey).toBe(false);
    expect(provider.capabilities.supportsCustomBaseUrl).toBe(true);
  });
});
