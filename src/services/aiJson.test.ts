import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../lib/errors';
import * as safeLog from '../lib/safeLog';
import { generateJson } from './aiJson';
import type { Settings } from '../types';
import type { AIProvider } from './providers/provider';

const hoisted = vi.hoisted(() => ({
  generateContent: vi.fn(),
  mapError: vi.fn((error: unknown) => {
    if (error instanceof AppError) return error;
    return new AppError({
      code: 'PROVIDER_UNAVAILABLE',
      message: error instanceof Error ? error.message : 'unavailable',
      retryable: true,
      cause: error,
    });
  }),
  caps: {
    jsonObjectMode: true,
    nativeJsonSchema: false,
    streamingStructuredOutput: false,
  },
}));

vi.mock('./providers/factory', () => ({
  getProviderForSettings: vi.fn(async () => {
    const provider = {
      capabilities: { structuredOutput: hoisted.caps },
      generateContent: hoisted.generateContent,
      mapError: hoisted.mapError,
    };
    return provider as unknown as AIProvider;
  }),
}));

const aiSettings: Settings['ai'] = {
  provider: 'openai',
  model: 'gpt-4o-mini',
  customPreamble: '',
  temperature: 0.2,
  aiLanguage: 'English',
  aiPersona: 'Neutral Scientist',
  researchAssistant: {
    autoFetchSimilar: false,
    autoFetchOnline: false,
    authorSearchLimit: 10,
  },
  enableTldr: true,
  ncbiApiKey: '',
  forceHeuristicMode: false,
};

const arraySchema = {
  type: 'array' as const,
  items: {
    type: 'object',
    properties: { name: { type: 'string' } },
    required: ['name'],
  },
};

describe('generateJson', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.caps.jsonObjectMode = true;
    hoisted.caps.nativeJsonSchema = false;
  });

  it('maps AbortError to STREAM_ABORTED without logging or mapError', async () => {
    const logSpy = vi.spyOn(safeLog, 'safeLogError').mockImplementation(() => {});
    hoisted.generateContent.mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'));
    await expect(
      generateJson(aiSettings, { model: aiSettings.model, prompt: 'p' }),
    ).rejects.toMatchObject({ code: 'STREAM_ABORTED', retryable: false });
    expect(logSpy).not.toHaveBeenCalled();
    expect(hoisted.mapError).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('keeps GEMINI_PARSE_FAILURE outside provider mapError', async () => {
    hoisted.generateContent.mockResolvedValueOnce({ text: 'definitely not json' });
    await expect(
      generateJson(aiSettings, { model: aiSettings.model, prompt: 'p' }),
    ).rejects.toMatchObject({ code: 'GEMINI_PARSE_FAILURE' });
    expect(hoisted.mapError).not.toHaveBeenCalled();
  });

  it('maps non-abort provider failures through mapError', async () => {
    const logSpy = vi.spyOn(safeLog, 'safeLogError').mockImplementation(() => {});
    hoisted.generateContent.mockRejectedValueOnce(new Error('502 upstream'));
    await expect(
      generateJson(aiSettings, { model: aiSettings.model, prompt: 'p' }),
    ).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE', retryable: true });
    expect(hoisted.mapError).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('wraps root array schemas so json_object mode stays on', async () => {
    hoisted.generateContent.mockResolvedValueOnce({
      text: JSON.stringify({ items: [{ name: 'Ada' }] }),
    });
    const out = await generateJson<{ name: string }[]>(aiSettings, {
      model: aiSettings.model,
      prompt: 'list authors',
      jsonSchema: arraySchema,
    });
    expect(out).toEqual([{ name: 'Ada' }]);
    expect(hoisted.generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        json: true,
        jsonSchema: undefined,
        prompt: expect.stringMatching(/"items"/),
      }),
    );
  });

  it('still accepts a raw JSON array when a wrapped schema was requested', async () => {
    hoisted.generateContent.mockResolvedValueOnce({
      text: JSON.stringify([{ name: 'Grace' }]),
    });
    const out = await generateJson<{ name: string }[]>(aiSettings, {
      model: aiSettings.model,
      prompt: 'list authors',
      jsonSchema: arraySchema,
    });
    expect(out).toEqual([{ name: 'Grace' }]);
  });

  it('passes native array schemas through without wrapping', async () => {
    hoisted.caps.nativeJsonSchema = true;
    hoisted.generateContent.mockResolvedValueOnce({
      text: JSON.stringify([{ name: 'Linus' }]),
    });
    const out = await generateJson<{ name: string }[]>(aiSettings, {
      model: aiSettings.model,
      prompt: 'list authors',
      jsonSchema: arraySchema,
    });
    expect(out).toEqual([{ name: 'Linus' }]);
    expect(hoisted.generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        json: true,
        jsonSchema: arraySchema,
      }),
    );
    const prompt = hoisted.generateContent.mock.calls[0]?.[0]?.prompt as string;
    expect(prompt).not.toMatch(/Respond with valid JSON matching this schema/);
  });
});
