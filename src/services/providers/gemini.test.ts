import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../lib/errors';
import { createGeminiProvider } from './gemini';

const generateContentMock = vi.fn();
const generateContentStreamMock = vi.fn();
const sendMessageStreamMock = vi.fn();
const chatCreateMock = vi.fn();

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

const getProviderApiKey = vi.fn();

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
    generateContentMock.mockResolvedValueOnce({ text: 'p' });
    expect(provider.testConnection).toBeDefined();
    await expect(provider.testConnection!()).resolves.toBe(true);
    expect(generateContentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-2.5-flash',
        contents: 'ping',
        config: { maxOutputTokens: 1 },
      }),
    );
  });
});
