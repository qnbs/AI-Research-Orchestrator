import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAnthropicProvider } from './anthropic';

const createMock = vi.fn();

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: createMock,
    },
  })),
}));

vi.mock('../apiKeyService', () => ({
  getProviderApiKey: vi.fn().mockResolvedValue('sk-ant-test'),
}));

describe('createAnthropicProvider', () => {
  beforeEach(() => {
    createMock.mockReset();
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
});
