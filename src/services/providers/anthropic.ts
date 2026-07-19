/**
 * Anthropic provider adapter using the Messages API.
 *
 * The SDK is loaded lazily and configured with `dangerouslyAllowBrowser: true`
 * because this is a client-only PWA. Streaming is supported via the SDK async
 * iterator. JSON output is enforced through prompt discipline and the shared
 * parser in the feature facade.
 */

import { AppError } from '../../lib/errors';
import { getProviderApiKey } from '../apiKeyService';
import type { AIProvider } from './provider';
import type {
  AIChatSessionRequest,
  AIContentRequest,
  AIContentResponse,
  AIStreamChunk,
  ProviderChatSession,
} from './types';

let client: import('@anthropic-ai/sdk').Anthropic | null = null;
let clientKey: string | null = null;
let clientBaseUrl: string | null = null;

async function getClient(requestBaseURL?: string): Promise<import('@anthropic-ai/sdk').Anthropic> {
  const apiKey = (await getProviderApiKey('anthropic')) ?? '';
  if (apiKey === '') {
    throw new AppError({
      code: 'NO_API_KEY',
      message: 'Please configure your Anthropic API key in Settings.',
      retryable: false,
    });
  }
  const baseURL = requestBaseURL || undefined;
  if (client === null || clientKey !== apiKey || clientBaseUrl !== baseURL) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    client = new Anthropic({ apiKey, baseURL, dangerouslyAllowBrowser: true });
    clientKey = apiKey;
    clientBaseUrl = baseURL ?? null;
  }
  return client;
}

function resetClient(): void {
  client = null;
  clientKey = null;
  clientBaseUrl = null;
}

function mapAnthropicError(error: unknown): AppError {
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

  let message = 'An Anthropic API error occurred.';
  let status: number | undefined;
  let code:
    | 'PROVIDER_RATE_LIMIT'
    | 'PROVIDER_QUOTA'
    | 'PROVIDER_AUTH'
    | 'PROVIDER_UNAVAILABLE'
    | 'PROVIDER_PARSE_FAILURE' = 'PROVIDER_UNAVAILABLE';

  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    if (typeof err.message === 'string') message = err.message;
    if (typeof err.status === 'number') status = err.status;
    if (err.error && typeof err.error === 'object') {
      const inner = err.error as Record<string, unknown>;
      if (typeof inner.message === 'string') message = inner.message;
      if (inner.type === 'rate_limit_error') code = 'PROVIDER_RATE_LIMIT';
    }
  }

  if (status === 401) code = 'PROVIDER_AUTH';
  else if (status === 429) code = 'PROVIDER_RATE_LIMIT';
  else if (message.toLowerCase().includes('quota')) code = 'PROVIDER_QUOTA';

  return new AppError({
    code,
    message,
    retryable: code === 'PROVIDER_RATE_LIMIT' || code === 'PROVIDER_UNAVAILABLE',
    cause: error,
    status,
  });
}

function buildSystemPrompt(request: AIContentRequest): string {
  const parts: string[] = [];
  if (request.system) parts.push(request.system);
  if (request.json) {
    parts.push('You must respond with valid JSON only, no markdown fences, no explanatory prose.');
  }
  return parts.join('\n\n');
}

export function createAnthropicProvider(): AIProvider {
  return {
    id: 'anthropic',
    capabilities: {
      streaming: true,
      jsonMode: true,
      webGrounding: false,
      chat: true,
      requiresApiKey: true,
    },

    async generateContent(request: AIContentRequest): Promise<AIContentResponse> {
      const anthropic = await getClient(request.baseURL);
      const response = await anthropic.messages.create(
        {
          model: request.model,
          max_tokens: request.maxOutputTokens ?? 4096,
          temperature: request.temperature ?? 0.7,
          system: buildSystemPrompt(request) || undefined,
          messages: [{ role: 'user', content: request.prompt }],
        },
        { signal: request.signal },
      );

      const text = extractText(response.content);
      return { text };
    },

    async *generateContentStream(request: AIContentRequest): AsyncGenerator<AIStreamChunk> {
      const anthropic = await getClient(request.baseURL);
      const stream = await anthropic.messages.create(
        {
          model: request.model,
          max_tokens: request.maxOutputTokens ?? 4096,
          temperature: request.temperature ?? 0.7,
          system: buildSystemPrompt(request) || undefined,
          messages: [{ role: 'user', content: request.prompt }],
          stream: true,
        },
        { signal: request.signal },
      );

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
          yield { text: event.delta.text };
        }
      }
      yield { done: true };
    },

    async createChatSession(request: AIChatSessionRequest): Promise<ProviderChatSession> {
      const anthropic = await getClient(request.baseURL);
      const system = request.system;
      const history = (request.history ?? []).map((m) => ({
        role: m.role === 'model' ? ('assistant' as const) : ('user' as const),
        content: m.text,
      }));

      return {
        async sendMessageStream({ message }) {
          const messages = [...history, { role: 'user' as const, content: message }];
          const stream = await anthropic.messages.create(
            {
              model: request.model,
              max_tokens: 4096,
              temperature: request.temperature ?? 0.7,
              system,
              messages,
              stream: true,
            },
            { signal: request.signal },
          );
          return (async function* () {
            for await (const event of stream) {
              if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
                yield { text: event.delta.text };
              }
            }
          })();
        },
      };
    },

    mapError: mapAnthropicError,

    async testConnection(): Promise<boolean> {
      const anthropic = await getClient();
      await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
      });
      return true;
    },

    reset: resetClient,
  };
}

function extractText(content: unknown): string {
  if (!Array.isArray(content)) return '';
  return content
    .map((block) => {
      if (
        block &&
        typeof block === 'object' &&
        'type' in block &&
        block.type === 'text' &&
        'text' in block
      ) {
        return String(block.text);
      }
      return '';
    })
    .join('');
}
