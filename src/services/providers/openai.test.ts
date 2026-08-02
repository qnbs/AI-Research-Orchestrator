import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../lib/errors';
import { createOpenAIProvider } from './openai';

const createMock = vi.fn();
const getProviderApiKey = vi.fn();

vi.mock('openai', () => ({
  // Vitest 4: mocks used with `new` must be function/class, not arrow implementations.
  default: vi.fn().mockImplementation(function MockOpenAI(this: {
    chat: { completions: { create: typeof createMock } };
  }) {
    this.chat = {
      completions: {
        create: createMock,
      },
    };
  }),
}));

vi.mock('../apiKeyService', () => ({
  getProviderApiKey: (...args: unknown[]) => getProviderApiKey(...args),
}));

describe('createOpenAIProvider', () => {
  beforeEach(() => {
    createMock.mockReset();
    getProviderApiKey.mockReset();
    getProviderApiKey.mockResolvedValue('sk-test');
    createOpenAIProvider().reset?.();
  });

  it('generates content', async () => {
    createMock.mockResolvedValueOnce({
      choices: [{ message: { content: '{"answer": 42}' } }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    });

    const provider = createOpenAIProvider();
    const response = await provider.generateContent({
      model: 'gpt-5',
      prompt: 'hello',
      json: true,
      maxOutputTokens: 256,
      baseURL: 'https://api.openai.com/v1',
    });

    expect(response.text).toBe('{"answer": 42}');
    expect(response.usage?.totalTokens).toBe(15);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-5',
        max_completion_tokens: 256,
        response_format: { type: 'json_object' },
      }),
      expect.objectContaining({ signal: undefined }),
    );
    expect(createMock.mock.calls[0][0]).not.toHaveProperty('max_tokens');
  });

  it('keeps max_tokens for legacy chat models', async () => {
    createMock.mockResolvedValueOnce({
      choices: [{ message: { content: 'ok' } }],
    });

    const provider = createOpenAIProvider();
    await provider.generateContent({
      model: 'gpt-4.1-mini',
      prompt: 'hello',
      maxOutputTokens: 128,
    });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4.1-mini',
        max_tokens: 128,
      }),
      expect.anything(),
    );
    expect(createMock.mock.calls[0][0]).not.toHaveProperty('max_completion_tokens');
  });

  it('streams content', async () => {
    createMock.mockResolvedValueOnce({
      [Symbol.asyncIterator]: async function* () {
        yield { choices: [{ delta: { content: 'hi' } }] };
        yield { choices: [{ delta: { content: ' there' } }] };
      },
    });

    const provider = createOpenAIProvider();
    const chunks: string[] = [];
    for await (const chunk of provider.generateContentStream({ model: 'gpt-5', prompt: 'hello' })) {
      if (chunk.text) chunks.push(chunk.text);
    }
    expect(chunks).toEqual(['hi', ' there']);
  });

  it('maps 401 to PROVIDER_AUTH', () => {
    const provider = createOpenAIProvider();
    const error = provider.mapError({ status: 401, message: 'Unauthorized' });
    expect(error.code).toBe('PROVIDER_AUTH');
    expect(error.status).toBe(401);
  });

  it('maps 429 to PROVIDER_RATE_LIMIT', () => {
    const provider = createOpenAIProvider();
    const error = provider.mapError({ status: 429, message: 'Rate limited' });
    expect(error.code).toBe('PROVIDER_RATE_LIMIT');
    expect(error.retryable).toBe(true);
  });

  it('aborts are not retried by the provider', async () => {
    const abortError = new DOMException('Aborted', 'AbortError');
    createMock.mockRejectedValueOnce(abortError);
    const provider = createOpenAIProvider();
    const controller = new AbortController();
    controller.abort();
    await expect(
      provider.generateContent({ model: 'gpt-5', prompt: 'x', signal: controller.signal }),
    ).rejects.toBe(abortError);
  });

  it('throws NO_API_KEY when vault is empty', async () => {
    getProviderApiKey.mockResolvedValueOnce(null);
    const provider = createOpenAIProvider();
    await expect(provider.generateContent({ model: 'gpt-5', prompt: 'x' })).rejects.toMatchObject({
      code: 'NO_API_KEY',
    });
  });

  it('uses max_completion_tokens for gpt-4o family', async () => {
    createMock.mockResolvedValueOnce({ choices: [{ message: { content: 'ok' } }] });
    const provider = createOpenAIProvider();
    await provider.generateContent({
      model: 'gpt-4o-mini',
      prompt: 'hello',
      maxOutputTokens: 64,
    });
    expect(createMock.mock.calls[0][0]).toMatchObject({ max_completion_tokens: 64 });
    expect(createMock.mock.calls[0][0]).not.toHaveProperty('max_tokens');
  });

  it('maps insufficient_quota and abort errors', () => {
    const provider = createOpenAIProvider();
    expect(
      provider.mapError({
        error: { code: 'insufficient_quota', message: 'billing' },
      }).code,
    ).toBe('PROVIDER_QUOTA');
    expect(provider.mapError({ error: { code: 'rate_limit_exceeded' } }).code).toBe(
      'PROVIDER_RATE_LIMIT',
    );
    const abort = new DOMException('Aborted', 'AbortError');
    expect(provider.mapError(abort).retryable).toBe(false);
    const existing = new AppError({ code: 'PROVIDER_AUTH', message: 'x', retryable: false });
    expect(provider.mapError(existing)).toBe(existing);
  });

  it('creates a chat session and streams replies', async () => {
    createMock.mockResolvedValueOnce({
      [Symbol.asyncIterator]: async function* () {
        yield { choices: [{ delta: { content: 'hi' } }] };
      },
    });
    const provider = createOpenAIProvider();
    const session = await provider.createChatSession({
      model: 'gpt-5',
      system: 'sys',
      history: [
        { role: 'user', text: 'u' },
        { role: 'model', text: 'm' },
      ],
      baseURL: 'https://openrouter.ai/api/v1',
    });
    const chunks: string[] = [];
    for await (const chunk of await session.sendMessageStream({ message: 'next' })) {
      if (chunk.text) chunks.push(chunk.text);
    }
    expect(chunks).toEqual(['hi']);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-5',
        stream: true,
        messages: expect.arrayContaining([
          { role: 'system', content: 'sys' },
          { role: 'user', content: 'u' },
          { role: 'assistant', content: 'm' },
          { role: 'user', content: 'next' },
        ]),
      }),
      expect.anything(),
    );
  });

  it('testConnection pings a cheap model', async () => {
    createMock.mockResolvedValueOnce({ choices: [{ message: { content: 'p' } }] });
    const provider = createOpenAIProvider();
    await expect(provider.testConnection!('https://api.openai.com/v1')).resolves.toBe(true);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4.1-mini',
        messages: [{ role: 'user', content: 'ping' }],
      }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('exposes jsonObjectMode capability without native schema', () => {
    const provider = createOpenAIProvider();
    expect(provider.capabilities.supportsCustomBaseUrl).toBe(true);
    expect(provider.capabilities.structuredOutput.jsonObjectMode).toBe(true);
    expect(provider.capabilities.structuredOutput.nativeJsonSchema).toBe(false);
  });
});
