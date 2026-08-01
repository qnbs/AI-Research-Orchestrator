import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createOpenAIProvider } from './openai';

const createMock = vi.fn();

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: createMock,
      },
    },
  })),
}));

vi.mock('../apiKeyService', () => ({
  getProviderApiKey: vi.fn().mockResolvedValue('sk-test'),
}));

describe('createOpenAIProvider', () => {
  beforeEach(() => {
    createMock.mockReset();
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
});
