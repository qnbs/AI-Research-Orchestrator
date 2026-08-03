import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../lib/errors';
import { createGeminiProvider } from './gemini';

const {
  generateContentMock,
  generateContentStreamMock,
  sendMessageStreamMock,
  chatCreateMock,
  getProviderApiKey,
} = vi.hoisted(() => ({
  generateContentMock: vi.fn(),
  generateContentStreamMock: vi.fn(),
  sendMessageStreamMock: vi.fn(),
  chatCreateMock: vi.fn(),
  getProviderApiKey: vi.fn(),
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(function MockGoogleGenAI(this: {
    models: {
      generateContent: typeof generateContentMock;
      generateContentStream: typeof generateContentStreamMock;
    };
    chats: { create: typeof chatCreateMock };
  }) {
    this.models = {
      generateContent: generateContentMock,
      generateContentStream: generateContentStreamMock,
    };
    this.chats = {
      create: chatCreateMock,
    };
  }),
}));

vi.mock('../apiKeyService', () => ({
  getProviderApiKey: (...args: unknown[]) => getProviderApiKey(...args),
}));

describe('createGeminiProvider', () => {
  let provider: ReturnType<typeof createGeminiProvider>;

  beforeEach(() => {
    provider = createGeminiProvider();
    provider.reset?.();
    generateContentMock.mockReset();
    generateContentStreamMock.mockReset();
    sendMessageStreamMock.mockReset();
    chatCreateMock.mockReset();
    getProviderApiKey.mockReset();
    getProviderApiKey.mockResolvedValue('AIza-test-key');
    chatCreateMock.mockReturnValue({
      sendMessageStream: sendMessageStreamMock,
    });
  });

  it('generates content with JSON schema config', async () => {
    generateContentMock.mockResolvedValueOnce({ text: '{"topic":"aspirin"}' });

    const response = await provider.generateContent({
      model: 'gemini-2.5-flash',
      prompt: 'rank these',
      json: true,
      jsonSchema: { type: 'object', properties: { topic: { type: 'string' } } },
      temperature: 0.2,
      maxOutputTokens: 128,
    });

    expect(response.text).toBe('{"topic":"aspirin"}');
    expect(generateContentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-2.5-flash',
        contents: 'rank these',
        config: expect.objectContaining({
          temperature: 0.2,
          maxOutputTokens: 128,
          responseMimeType: 'application/json',
          responseSchema: expect.objectContaining({ type: 'OBJECT' }),
        }),
      }),
    );
  });

  it('streams content chunks', async () => {
    generateContentStreamMock.mockResolvedValueOnce({
      [Symbol.asyncIterator]: async function* () {
        yield { text: 'chunk-a' };
        yield { text: 'chunk-b' };
      },
    });

    const chunks: string[] = [];
    for await (const chunk of provider.generateContentStream({
      model: 'gemini-2.5-flash',
      prompt: 'synthesize',
    })) {
      if (chunk.text) chunks.push(chunk.text);
    }

    expect(chunks).toEqual(['chunk-a', 'chunk-b']);
  });

  it('creates a chat session with mapped history roles', async () => {
    sendMessageStreamMock.mockResolvedValueOnce({
      [Symbol.asyncIterator]: async function* () {
        yield { text: 'reply' };
      },
    });

    const session = await provider.createChatSession({
      model: 'gemini-2.5-flash',
      system: 'You are helpful',
      history: [
        { role: 'user', text: 'hi' },
        { role: 'model', text: 'hello' },
      ],
    });

    const chunks: string[] = [];
    for await (const chunk of await session.sendMessageStream({ message: 'next' })) {
      if (chunk.text) chunks.push(chunk.text);
    }

    expect(chunks).toEqual(['reply']);
    expect(chatCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-2.5-flash',
        history: [
          { role: 'user', parts: [{ text: 'hi' }] },
          { role: 'model', parts: [{ text: 'hello' }] },
        ],
      }),
    );
  });

  it('maps auth errors from provider responses', () => {
    const mapped = provider.mapError({ status: 401, message: 'invalid key' });
    expect(mapped).toBeInstanceOf(AppError);
    expect(mapped.code).toBe('PROVIDER_AUTH');
    expect(mapped.retryable).toBe(false);
  });

  it('throws NO_API_KEY when vault is empty', async () => {
    getProviderApiKey.mockResolvedValueOnce(null);

    await expect(
      provider.generateContent({ model: 'gemini-2.5-flash', prompt: 'ping' }),
    ).rejects.toMatchObject({ code: 'NO_API_KEY' });
  });

  it('testConnection pings the model', async () => {
    const timeoutSignal = new AbortController().signal;
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(timeoutSignal);
    generateContentMock.mockResolvedValueOnce({ text: 'p' });
    expect(provider.testConnection).toBeDefined();
    await expect(provider.testConnection!()).resolves.toBe(true);
    expect(timeoutSpy).toHaveBeenCalledWith(15_000);
    expect(generateContentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-2.5-flash',
        contents: 'ping',
        config: {
          maxOutputTokens: 1,
          abortSignal: timeoutSignal,
        },
      }),
    );
    timeoutSpy.mockRestore();
  });

  it('exposes webGrounding + nativeJsonSchema capabilities', () => {
    expect(provider.capabilities.webGrounding).toBe(true);
    expect(provider.capabilities.structuredOutput.nativeJsonSchema).toBe(true);
    expect(provider.capabilities.requiresApiKey).toBe(true);
  });

  it('passes abortSignal and system instruction into generateContent', async () => {
    generateContentMock.mockResolvedValueOnce({ text: 'ok' });
    const controller = new AbortController();
    await provider.generateContent({
      model: 'gemini-2.5-flash',
      prompt: 'ping',
      system: 'Be brief',
      signal: controller.signal,
      webGrounding: true,
      thinkingBudget: 0,
    });
    expect(generateContentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          systemInstruction: 'Be brief',
          abortSignal: controller.signal,
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingBudget: 0 },
        }),
      }),
    );
  });

  it('extracts grounding sources from candidates', async () => {
    generateContentMock.mockResolvedValueOnce({
      text: 'summary',
      candidates: [
        {
          groundingMetadata: {
            groundingChunks: [
              { web: { uri: 'https://example.org/a', title: 'A' } },
              { web: { uri: 'https://example.org/b' } },
              { web: {} },
            ],
          },
        },
      ],
    });
    const response = await provider.generateContent({
      model: 'gemini-2.5-flash',
      prompt: 'grounded',
      webGrounding: true,
    });
    expect(response.sources).toEqual([
      { uri: 'https://example.org/a', title: 'A' },
      { uri: 'https://example.org/b', title: undefined },
    ]);
  });

  it('converts nested JSON schema types for Gemini', async () => {
    generateContentMock.mockResolvedValueOnce({ text: '[]' });
    await provider.generateContent({
      model: 'gemini-2.5-flash',
      prompt: 'schema',
      json: true,
      jsonSchema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            score: { type: 'integer' },
            tags: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    });
    const config = generateContentMock.mock.calls[0]?.[0]?.config as {
      responseSchema: Record<string, unknown>;
    };
    expect(config.responseSchema).toMatchObject({
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          score: { type: 'INTEGER' },
          tags: { type: 'ARRAY', items: { type: 'STRING' } },
        },
      },
    });
  });

  it('maps rate-limit, quota, safety, and abort errors', () => {
    expect(provider.mapError({ status: 429, message: 'slow down' }).code).toBe(
      'PROVIDER_RATE_LIMIT',
    );
    expect(provider.mapError({ status: 429 }).retryable).toBe(true);

    expect(provider.mapError(new Error('quota exhausted')).code).toBe('PROVIDER_QUOTA');
    expect(provider.mapError(new Error('quota exhausted')).retryable).toBe(false);

    expect(
      provider.mapError({
        response: { candidates: [{ finishReason: 'SAFETY' }] },
      }).code,
    ).toBe('PROVIDER_PARSE_FAILURE');
    expect(
      provider.mapError({
        response: { candidates: [{ finishReason: 'MAX_TOKENS' }] },
      }).message,
    ).toMatch(/token limit/i);

    // Provider adapters map AbortError → PROVIDER_UNAVAILABLE (non-retryable).
    // STREAM_ABORTED is stamped at the geminiService façade, not in mapError.
    const abortDom = new DOMException('Aborted', 'AbortError');
    expect(provider.mapError(abortDom)).toMatchObject({
      code: 'PROVIDER_UNAVAILABLE',
      retryable: false,
    });

    const abortErr = new Error('aborted');
    abortErr.name = 'AbortError';
    expect(provider.mapError(abortErr)).toMatchObject({
      code: 'PROVIDER_UNAVAILABLE',
      retryable: false,
    });

    const existing = new AppError({ code: 'PROVIDER_AUTH', message: 'keep', retryable: false });
    expect(provider.mapError(existing)).toBe(existing);
  });

  it('reset forces a new GoogleGenAI client on next call', async () => {
    const { GoogleGenAI } = await import('@google/genai');
    generateContentMock.mockResolvedValue({ text: 'ok' });
    await provider.generateContent({ model: 'gemini-2.5-flash', prompt: 'a' });
    const callsBefore = vi.mocked(GoogleGenAI).mock.calls.length;
    provider.reset?.();
    await provider.generateContent({ model: 'gemini-2.5-flash', prompt: 'b' });
    expect(vi.mocked(GoogleGenAI).mock.calls.length).toBeGreaterThan(callsBefore);
  });
});
