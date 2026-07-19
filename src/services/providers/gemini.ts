import { GoogleGenAI } from '@google/genai';
import { AppError } from '../../lib/errors';
import { getProviderApiKey } from '../apiKeyService';
import type { AIProvider } from './provider';
import type {
  AIChatSessionRequest,
  AIContentRequest,
  AIContentResponse,
  AIJsonSchema,
  AIStreamChunk,
  ProviderChatSession,
} from './types';

let client: GoogleGenAI | null = null;
let clientKey: string | null = null;

async function getClient(): Promise<GoogleGenAI> {
  const apiKey = await getProviderApiKey('gemini');
  if (!apiKey) {
    throw new AppError({
      code: 'NO_API_KEY',
      message:
        'Please configure your Gemini API key in Settings. You can get a free key at https://aistudio.google.com.',
      retryable: false,
    });
  }
  if (client === null || clientKey !== apiKey) {
    client = new GoogleGenAI({ apiKey });
    clientKey = apiKey;
  }
  return client;
}

function resetClient(): void {
  client = null;
  clientKey = null;
}

/**
 * Recursively convert lowercase JSON Schema types into Gemini's uppercase Type
 * enum values (STRING, OBJECT, ARRAY, NUMBER, INTEGER, BOOLEAN).
 */
function toGeminiSchema(schema: AIJsonSchema): Record<string, unknown> {
  if (!schema || typeof schema !== 'object') return schema as Record<string, unknown>;

  const typeMap: Record<string, string> = {
    string: 'STRING',
    object: 'OBJECT',
    array: 'ARRAY',
    number: 'NUMBER',
    integer: 'INTEGER',
    boolean: 'BOOLEAN',
  };

  const converted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === 'type' && typeof value === 'string' && value in typeMap) {
      converted[key] = typeMap[value];
    } else if (key === 'properties' && value && typeof value === 'object') {
      converted[key] = Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([k, v]) => [
          k,
          toGeminiSchema(v as AIJsonSchema),
        ]),
      );
    } else if (key === 'items' && value && typeof value === 'object') {
      converted[key] = toGeminiSchema(value as AIJsonSchema);
    } else {
      converted[key] = value;
    }
  }
  return converted;
}

function buildConfig(request: AIContentRequest): Record<string, unknown> {
  const config: Record<string, unknown> = {};
  if (request.system !== undefined) config.systemInstruction = request.system;
  if (request.temperature !== undefined) config.temperature = request.temperature;
  if (request.maxOutputTokens !== undefined) config.maxOutputTokens = request.maxOutputTokens;
  if (request.json) config.responseMimeType = 'application/json';
  if (request.jsonSchema) config.responseSchema = toGeminiSchema(request.jsonSchema);
  if (request.webGrounding) config.tools = [{ googleSearch: {} }];
  if (request.thinkingBudget !== undefined) {
    config.thinkingConfig = { thinkingBudget: request.thinkingBudget };
  }
  return config;
}

function extractSources(response: unknown): Array<{ uri: string; title?: string }> | undefined {
  if (!response || typeof response !== 'object') return undefined;
  const candidates = (response as Record<string, unknown>).candidates as unknown[] | undefined;
  if (!Array.isArray(candidates) || candidates.length === 0) return undefined;
  const first = candidates[0] as Record<string, unknown>;
  const meta = first.groundingMetadata as Record<string, unknown> | undefined;
  const chunks = meta?.groundingChunks as unknown[] | undefined;
  if (!Array.isArray(chunks)) return undefined;
  const sources: Array<{ uri: string; title?: string }> = [];
  for (const chunk of chunks) {
    const web = (chunk as Record<string, unknown>)?.web as Record<string, string> | undefined;
    if (web?.uri) {
      sources.push({ uri: web.uri, title: web.title });
    }
  }
  return sources.length > 0 ? sources : undefined;
}

function getGeminiErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'An unknown AI error occurred. Please check your network connection.';
  }

  if ('response' in error) {
    const response = (error as Record<string, unknown>).response as Record<string, unknown>;
    const candidates = response?.candidates as Array<Record<string, unknown>> | undefined;
    const candidate = candidates?.[0];
    const finishReason = candidate?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
      switch (finishReason) {
        case 'SAFETY':
          return "The AI's response was blocked due to safety settings. Please modify your query and try again.";
        case 'RECITATION':
          return "The AI's response was blocked because it was too similar to a known source. Please try a different query.";
        case 'MAX_TOKENS':
          return 'The request exceeded the token limit. Please try a more focused query or reduce the number of articles to analyze.';
        default:
          return `The AI's response was blocked for an unknown reason (${String(finishReason)}).`;
      }
    }
  }

  if ('status' in error) {
    const status = (error as Record<string, unknown>).status;
    if (status === 429)
      return 'You have exceeded the API rate limit. Please wait a moment before trying again.';
    if (status === 503) return 'The AI service is currently overloaded. Please try again later.';
    if (status === 401 || status === 403)
      return 'Your Gemini API key is invalid or has been revoked. Please check it in Settings.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unknown AI error occurred. Please check your network connection.';
}

function mapGeminiError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  // AbortError must never be retried - user explicitly cancelled
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new AppError({
      code: 'PROVIDER_UNAVAILABLE',
      message: error.message,
      retryable: false,
      cause: error,
    });
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return new AppError({
      code: 'PROVIDER_UNAVAILABLE',
      message: error.message,
      retryable: false,
      cause: error,
    });
  }

  const message = getGeminiErrorMessage(error);
  let code:
    | 'PROVIDER_RATE_LIMIT'
    | 'PROVIDER_QUOTA'
    | 'PROVIDER_AUTH'
    | 'PROVIDER_UNAVAILABLE'
    | 'PROVIDER_PARSE_FAILURE' = 'PROVIDER_UNAVAILABLE';
  let retryable = true;

  if (!error || typeof error !== 'object') {
    return new AppError({ code, message, retryable });
  }

  const status = 'status' in error ? (error as Record<string, unknown>).status : undefined;
  const msg = String(message).toLowerCase();

  if (status === 429 || msg.includes('rate limit')) {
    code = 'PROVIDER_RATE_LIMIT';
    retryable = true;
  } else if (status === 401 || status === 403 || msg.includes('api key is invalid')) {
    code = 'PROVIDER_AUTH';
    retryable = false;
  } else if (msg.includes('quota') || msg.includes('billing') || msg.includes('exhausted')) {
    code = 'PROVIDER_QUOTA';
    retryable = false;
  } else if (msg.includes('blocked') || msg.includes('safety') || msg.includes('recitation')) {
    code = 'PROVIDER_PARSE_FAILURE';
    retryable = false;
  }

  return new AppError({
    code,
    message,
    retryable,
    cause: error,
    status: typeof status === 'number' ? status : undefined,
  });
}

export function createGeminiProvider(): AIProvider {
  return {
    id: 'gemini',
    capabilities: {
      streaming: true,
      jsonMode: true,
      webGrounding: true,
      chat: true,
      requiresApiKey: true,
    },

    async generateContent(request: AIContentRequest): Promise<AIContentResponse> {
      const ai = await getClient();
      const response = await ai.models.generateContent({
        model: request.model,
        contents: request.prompt,
        config: {
          ...buildConfig(request),
          abortSignal: request.signal,
        },
      });
      return {
        text: response.text ?? '',
        sources: extractSources(response),
      };
    },

    async *generateContentStream(request: AIContentRequest): AsyncGenerator<AIStreamChunk> {
      const ai = await getClient();
      const stream = await ai.models.generateContentStream({
        model: request.model,
        contents: request.prompt,
        config: {
          ...buildConfig(request),
          abortSignal: request.signal,
        },
      });
      for await (const chunk of stream) {
        yield { text: chunk.text };
      }
    },

    async createChatSession(request: AIChatSessionRequest): Promise<ProviderChatSession> {
      const ai = await getClient();
      const history = (request.history ?? []).map((m) => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.text }],
      }));
      const chat = ai.chats.create({
        model: request.model,
        config: {
          systemInstruction: request.system,
          temperature: request.temperature,
        },
        history,
      });

      return {
        async sendMessageStream({ message }) {
          const stream = await chat.sendMessageStream({
            message,
            config: { abortSignal: request.signal },
          });
          return (async function* () {
            for await (const chunk of stream) {
              yield { text: chunk.text };
            }
          })();
        },
      };
    },

    mapError: mapGeminiError,

    async testConnection(): Promise<boolean> {
      const ai = await getClient();
      await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'ping',
        config: { maxOutputTokens: 1 },
      });
      return true;
    },

    reset: resetClient,
  };
}
