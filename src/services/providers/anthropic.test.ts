import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../lib/errors';
import { createAnthropicProvider } from './anthropic';

const { createMock, getProviderApiKey } = vi.hoisted(() => ({
  createMock: vi.fn(),
  getProviderApiKey: vi.fn(),
}));

vi.mock('@anthropic-ai/sdk', () => ({
  // Vitest 4: mocks used with `new` must be function/class, not arrow implementations.
  default: vi.fn().mockImplementation(function MockAnthropic(this: {
    messages: { create: typeof createMock };
  }) {
    this.messages = {
      create: createMock,
    };
  }),
}));

vi.mock('../apiKeyService', () => ({
  getProviderApiKey: (...args: unknown[]) => getProviderApiKey(...args),
}));

describe('createAnthropicProvider', () => {
  beforeEach(() => {
    createMock.mockReset();
    getProviderApiKey.mockReset();
    getProviderApiKey.mockResolvedValue('sk-ant-test');
    createAnthropicProvider().reset?.();
  });

  it('generates content', async () => {
    createMock.mockResolvedValueOnce({
      content: [{ type: 'text', text: '{"answer": 42}' }],
    });

    const provider = createAnthropicProvider();
    const response = await provider.generateContent({
      model: 'claude-sonnet-4-5',
      prompt: 'hello',
      json: true,
      baseURL: 'https://api.anthropic.com',
    });

    expect(response.text).toBe('{"answer": 42}');
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-sonnet-4-5',
        system: expect.stringContaining('valid JSON only'),
      }),
      expect.objectContaining({ signal: undefined }),
    );
  });

  it('streams content', async () => {
    createMock.mockResolvedValueOnce({
      [Symbol.asyncIterator]: async function* () {
        yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'hi' } };
        yield { type: 'content_block_delta', delta: { type: 'text_delta', text: ' there' } };
      },
    });

    const provider = createAnthropicProvider();
    const chunks: string[] = [];
    for await (const chunk of provider.generateContentStream({
      model: 'claude-sonnet-4-5',
      prompt: 'hello',
    })) {
      if (chunk.text) chunks.push(chunk.text);
    }
    expect(chunks).toEqual(['hi', ' there']);
  });

  it('maps 401 to PROVIDER_AUTH', () => {
    const provider = createAnthropicProvider();
    const error = provider.mapError({ status: 401, message: 'Unauthorized' });
    expect(error.code).toBe('PROVIDER_AUTH');
    expect(error.status).toBe(401);
  });

  it('maps 429 to PROVIDER_RATE_LIMIT', () => {
    const provider = createAnthropicProvider();
    const error = provider.mapError({ status: 429, message: 'Rate limited' });
    expect(error.code).toBe('PROVIDER_RATE_LIMIT');
    expect(error.retryable).toBe(true);
  });

  it('aborts are not retried by the provider', async () => {
    const abortError = new DOMException('Aborted', 'AbortError');
    createMock.mockRejectedValueOnce(abortError);
    const provider = createAnthropicProvider();
    const controller = new AbortController();
    controller.abort();
    await expect(
      provider.generateContent({
        model: 'claude-sonnet-4-5',
        prompt: 'x',
        signal: controller.signal,
      }),
    ).rejects.toBe(abortError);
  });

  it('throws NO_API_KEY when vault is empty', async () => {
    getProviderApiKey.mockResolvedValueOnce(null);
    const provider = createAnthropicProvider();
    await expect(
      provider.generateContent({ model: 'claude-sonnet-4-5', prompt: 'x' }),
    ).rejects.toMatchObject({ code: 'NO_API_KEY' });
  });

  it('maps rate_limit_error type, quota message, and abort', () => {
    const provider = createAnthropicProvider();
    expect(provider.mapError({ error: { type: 'rate_limit_error', message: 'slow' } }).code).toBe(
      'PROVIDER_RATE_LIMIT',
    );
    expect(provider.mapError({ message: 'quota exceeded' }).code).toBe('PROVIDER_QUOTA');
    expect(provider.mapError({ status: 403, message: 'forbidden' }).code).toBe(
      'PROVIDER_UNAVAILABLE',
    );
    // Provider adapters map AbortError → PROVIDER_UNAVAILABLE (non-retryable).
    // STREAM_ABORTED is stamped at the geminiService façade, not in mapError.
    const abort = new DOMException('Aborted', 'AbortError');
    expect(provider.mapError(abort)).toMatchObject({
      code: 'PROVIDER_UNAVAILABLE',
      retryable: false,
    });
    class APIUserAbortError extends Error {
      constructor() {
        super('Request was aborted.');
      }
    }
    expect(provider.mapError(new APIUserAbortError())).toMatchObject({
      code: 'PROVIDER_UNAVAILABLE',
      retryable: false,
    });
    const existing = new AppError({ code: 'PROVIDER_AUTH', message: 'x', retryable: false });
    expect(provider.mapError(existing)).toBe(existing);
  });

  it('joins text blocks and ignores non-text content', async () => {
    createMock.mockResolvedValueOnce({
      content: [
        { type: 'text', text: 'hello ' },
        { type: 'tool_use', id: 't1' },
        { type: 'text', text: 'world' },
      ],
    });
    const provider = createAnthropicProvider();
    const response = await provider.generateContent({
      model: 'claude-sonnet-4-5',
      prompt: 'x',
    });
    expect(response.text).toBe('hello world');
  });

  it('creates a chat session and streams deltas', async () => {
    createMock.mockResolvedValueOnce({
      [Symbol.asyncIterator]: async function* () {
        yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'ok' } };
        yield { type: 'message_stop' };
      },
    });
    const provider = createAnthropicProvider();
    const session = await provider.createChatSession({
      model: 'claude-sonnet-4-5',
      system: 'sys',
      history: [{ role: 'user', text: 'hi' }],
      baseURL: 'https://api.anthropic.com',
    });
    const chunks: string[] = [];
    for await (const chunk of await session.sendMessageStream({ message: 'next' })) {
      if (chunk.text) chunks.push(chunk.text);
    }
    expect(chunks).toEqual(['ok']);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-sonnet-4-5',
        stream: true,
        system: 'sys',
        messages: [
          { role: 'user', content: 'hi' },
          { role: 'user', content: 'next' },
        ],
      }),
      expect.anything(),
    );
  });

  it('keeps multi-turn chat context across three sends', async () => {
    const replies = ['r1', 'r2', 'r3'];
    for (const reply of replies) {
      createMock.mockResolvedValueOnce({
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: reply } };
          yield { type: 'message_stop' };
        },
      });
    }
    const provider = createAnthropicProvider();
    const session = await provider.createChatSession({
      model: 'claude-sonnet-4-5',
      system: 'sys',
      baseURL: 'https://api.anthropic.com',
    });

    for (const message of ['t1', 't2', 't3']) {
      for await (const _chunk of await session.sendMessageStream({ message })) {
        // drain
      }
    }

    expect(createMock).toHaveBeenCalledTimes(3);
    expect(createMock.mock.calls[2][0].messages).toEqual([
      { role: 'user', content: 't1' },
      { role: 'assistant', content: 'r1' },
      { role: 'user', content: 't2' },
      { role: 'assistant', content: 'r2' },
      { role: 'user', content: 't3' },
    ]);
  });

  it('does not commit history after a mid-stream failure', async () => {
    createMock
      .mockResolvedValueOnce({
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'ok' } };
          yield { type: 'message_stop' };
        },
      })
      .mockResolvedValueOnce({
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'partial' } };
          throw new Error('stream broken');
        },
      })
      .mockResolvedValueOnce({
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'recovered' } };
          yield { type: 'message_stop' };
        },
      });

    const provider = createAnthropicProvider();
    const session = await provider.createChatSession({
      model: 'claude-sonnet-4-5',
      system: 'sys',
      baseURL: 'https://api.anthropic.com',
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
    ).rejects.toThrow(/stream broken/);

    for await (const _chunk of await session.sendMessageStream({ message: 't3' })) {
      // drain
    }

    expect(createMock.mock.calls[2][0].messages).toEqual([
      { role: 'user', content: 't1' },
      { role: 'assistant', content: 'ok' },
      { role: 'user', content: 't3' },
    ]);
  });

  it('testConnection pings haiku', async () => {
    createMock.mockResolvedValueOnce({ content: [{ type: 'text', text: 'p' }] });
    const provider = createAnthropicProvider();
    await expect(provider.testConnection!('https://api.anthropic.com')).resolves.toBe(true);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-haiku-4-5',
        max_tokens: 1,
      }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('exposes custom base URL + jsonObjectMode capabilities', () => {
    const provider = createAnthropicProvider();
    expect(provider.capabilities.supportsCustomBaseUrl).toBe(true);
    expect(provider.capabilities.structuredOutput.jsonObjectMode).toBe(true);
    expect(provider.capabilities.structuredOutput.nativeJsonSchema).toBe(false);
  });
});
