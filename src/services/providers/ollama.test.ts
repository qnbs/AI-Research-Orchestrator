import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createOllamaProvider } from './ollama';
import { OLLAMA_MAX_NONSTREAM_BODY_BYTES } from './ollama';

describe('createOllamaProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('generates content', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ response: '{"answer": 42}' }),
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
            JSON.stringify({ response: ' there', done: true }),
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

  it('keeps 503 retryable even when the body says Not Found', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: async () => 'Not Found',
    });
    const provider = createOllamaProvider();
    await expect(
      provider.generateContent({ model: 'llama3.1:8b', prompt: 'x' }),
    ).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE',
      status: 503,
      retryable: true,
    });
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
      text: async () => JSON.stringify({ response: 'ok' }),
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

  it('mapError maps abort errors to non-retryable STREAM_ABORTED', () => {
    const provider = createOllamaProvider();
    const mapped = provider.mapError(new DOMException('Aborted', 'AbortError'));
    expect(mapped.code).toBe('STREAM_ABORTED');
    expect(mapped.retryable).toBe(false);
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
          const chunks = ['not-json\n', JSON.stringify({ response: 'ok', done: true }) + '\n'];
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

  it('throws when generate stream ends without a done marker', async () => {
    const encoder = new TextEncoder();
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      body: {
        getReader: () => {
          const payload = JSON.stringify({ response: 'partial' }) + '\n';
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
    await expect(
      (async () => {
        for await (const _chunk of provider.generateContentStream({
          model: 'llama3.1:8b',
          prompt: 'hello',
        })) {
          // drain
        }
      })(),
    ).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE',
      message: expect.stringContaining('done marker'),
      retryable: true,
    });
  });

  it('creates a chat session against /api/chat', async () => {
    const encoder = new TextEncoder();
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      body: {
        getReader: () => {
          const payload = JSON.stringify({ message: { content: 'chat-ok' }, done: true }) + '\n';
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

  it('keeps multi-turn chat context across three sends', async () => {
    const encoder = new TextEncoder();
    const mockChatResponse = (content: string) => ({
      ok: true,
      body: {
        getReader: () => {
          const payload = JSON.stringify({ message: { content }, done: true }) + '\n';
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
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(mockChatResponse('r1'))
      .mockResolvedValueOnce(mockChatResponse('r2'))
      .mockResolvedValueOnce(mockChatResponse('r3'));

    const provider = createOllamaProvider();
    const session = await provider.createChatSession({
      model: 'llama3.1:8b',
      system: 'sys',
      baseURL: 'http://127.0.0.1:11434',
    });

    for (const message of ['t1', 't2', 't3']) {
      for await (const _chunk of await session.sendMessageStream({ message })) {
        // drain
      }
    }

    expect(global.fetch).toHaveBeenCalledTimes(3);
    const thirdBody = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[2][1].body);
    expect(thirdBody.messages).toEqual([
      { role: 'system', content: 'sys' },
      { role: 'user', content: 't1' },
      { role: 'assistant', content: 'r1' },
      { role: 'user', content: 't2' },
      { role: 'assistant', content: 'r2' },
      { role: 'user', content: 't3' },
    ]);
  });

  it('marks in-band chat model-not-found errors as non-retryable', async () => {
    const encoder = new TextEncoder();
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      body: {
        getReader: () => {
          const payload = `${JSON.stringify({ error: "model 'missing' not found" })}\n`;
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
      model: 'missing',
      baseURL: 'http://127.0.0.1:11434',
    });
    await expect(
      (async () => {
        for await (const _chunk of await session.sendMessageStream({ message: 'hi' })) {
          // drain
        }
      })(),
    ).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE',
      retryable: false,
      context: 'ollama_model_not_found',
    });
  });

  it('does not commit history after in-band chat stream errors', async () => {
    const encoder = new TextEncoder();
    const ndjsonBody = (lines: unknown[]) => ({
      ok: true,
      body: {
        getReader: () => {
          const payload = lines.map((line) => JSON.stringify(line)).join('\n') + '\n';
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
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(ndjsonBody([{ message: { content: 'ok' }, done: true }]))
      .mockResolvedValueOnce(
        ndjsonBody([{ message: { content: 'partial' }, done: false }, { error: 'model stopped' }]),
      )
      .mockResolvedValueOnce(ndjsonBody([{ message: { content: 'recovered' }, done: true }]));

    const provider = createOllamaProvider();
    const session = await provider.createChatSession({
      model: 'llama3.1:8b',
      system: 'sys',
      baseURL: 'http://127.0.0.1:11434',
    });

    for await (const _chunk of await session.sendMessageStream({ message: 't1' })) {
      // drain
    }
    await expect(
      (async () => {
        for await (const _chunk of await session.sendMessageStream({ message: 'bad' })) {
          // drain
        }
      })(),
    ).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });

    for await (const _chunk of await session.sendMessageStream({ message: 't3' })) {
      // drain
    }

    const thirdBody = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[2][1].body);
    expect(thirdBody.messages).toEqual([
      { role: 'system', content: 'sys' },
      { role: 'user', content: 't1' },
      { role: 'assistant', content: 'ok' },
      { role: 'user', content: 't3' },
    ]);
  });

  it('does not commit history when the chat stream ends without done', async () => {
    const encoder = new TextEncoder();
    const ndjsonBody = (lines: unknown[]) => ({
      ok: true,
      body: {
        getReader: () => {
          const payload = lines.map((line) => JSON.stringify(line)).join('\n') + '\n';
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
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(ndjsonBody([{ message: { content: 'ok' }, done: true }]))
      .mockResolvedValueOnce(ndjsonBody([{ message: { content: 'partial' }, done: false }]))
      .mockResolvedValueOnce(ndjsonBody([{ message: { content: 'recovered' }, done: true }]));

    const provider = createOllamaProvider();
    const session = await provider.createChatSession({
      model: 'llama3.1:8b',
      baseURL: 'http://127.0.0.1:11434',
    });

    for await (const _chunk of await session.sendMessageStream({ message: 't1' })) {
      // drain
    }
    await expect(
      (async () => {
        for await (const _chunk of await session.sendMessageStream({ message: 'eof' })) {
          // drain
        }
      })(),
    ).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });

    for await (const _chunk of await session.sendMessageStream({ message: 't3' })) {
      // drain
    }

    const thirdBody = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[2][1].body);
    expect(thirdBody.messages).toEqual([
      { role: 'user', content: 't1' },
      { role: 'assistant', content: 'ok' },
      { role: 'user', content: 't3' },
    ]);
  });

  it('testConnection probes /api/version then /api/tags', async () => {
    const timeoutSignal = new AbortController().signal;
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(timeoutSignal);
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ version: '0.5.0' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [{ name: 'llama3.1:8b' }] }),
      });
    const provider = createOllamaProvider();
    await expect(provider.testConnection!('http://localhost:11434')).resolves.toBe(true);
    expect(timeoutSpy).toHaveBeenCalledWith(15_000);
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      'http://localhost:11434/api/version',
      expect.objectContaining({ signal: timeoutSignal }),
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'http://localhost:11434/api/tags',
      expect.objectContaining({ signal: timeoutSignal }),
    );
    timeoutSpy.mockRestore();
  });

  it('exposes requiresApiKey=false capability', () => {
    const provider = createOllamaProvider();
    expect(provider.capabilities.requiresApiKey).toBe(false);
    expect(provider.capabilities.supportsCustomBaseUrl).toBe(true);
  });

  it('rejects oversized non-stream generate bodies', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () => 'x'.repeat(OLLAMA_MAX_NONSTREAM_BODY_BYTES + 1),
    });
    const provider = createOllamaProvider();
    await expect(
      provider.generateContent({ model: 'llama3.1:8b', prompt: 'x' }),
    ).rejects.toMatchObject({
      code: 'PROVIDER_PARSE_FAILURE',
      context: 'ollama_body_size',
    });
  });
});
