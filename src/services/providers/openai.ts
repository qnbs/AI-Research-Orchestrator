/**
 * OpenAI-compatible provider adapter.
 *
 * Supports the official OpenAI API and OpenRouter-compatible endpoints via the
 * configurable `baseURL`. Streaming uses the SDK async iterator; JSON mode is
 * requested through `response_format: { type: 'json_object' }`.
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

let client: import('openai').OpenAI | null = null;
let clientKey: string | null = null;
let clientBaseUrl: string | null = null;

async function getClient(requestBaseURL?: string): Promise<import('openai').OpenAI> {
  const apiKey = (await getProviderApiKey('openai')) ?? '';
  if (apiKey === '') {
    throw new AppError({
      code: 'NO_API_KEY',
      message: 'Please configure your OpenAI API key in Settings.',
      retryable: false,
    });
  }
  const baseURL = requestBaseURL || undefined;
  if (client === null || clientKey !== apiKey || clientBaseUrl !== baseURL) {
    const { default: OpenAI } = await import('openai');
    client = new OpenAI({ apiKey, baseURL, dangerouslyAllowBrowser: true });
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

function mapOpenAIError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  let message = 'An OpenAI API error occurred.';
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
      if (typeof inner.code === 'string') {
        if (inner.code === 'insufficient_quota') code = 'PROVIDER_QUOTA';
        if (inner.code === 'rate_limit_exceeded') code = 'PROVIDER_RATE_LIMIT';
      }
    }
  }

  if (status === 401 || status === 403) code = 'PROVIDER_AUTH';
  else if (status === 429) code = 'PROVIDER_RATE_LIMIT';
  else if (message.toLowerCase().includes('quota')) code = 'PROVIDER_QUOTA';
  else if (/rate.?limit/i.test(message)) code = 'PROVIDER_RATE_LIMIT';

  return new AppError({
    code,
    message,
    retryable: code === 'PROVIDER_RATE_LIMIT' || code === 'PROVIDER_UNAVAILABLE',
    cause: error,
    status,
  });
}

export function createOpenAIProvider(): AIProvider {
  return {
    id: 'openai',
    capabilities: {
      streaming: true,
      jsonMode: true,
      webGrounding: false,
      chat: true,
      requiresApiKey: true,
    },

    async generateContent(request: AIContentRequest): Promise<AIContentResponse> {
      const openai = await getClient(request.baseURL);
      const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
      if (request.system) messages.push({ role: 'system', content: request.system });
      messages.push({ role: 'user', content: request.prompt });

      const completion = await openai.chat.completions.create({
        model: request.model,
        messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxOutputTokens,
        response_format: request.json ? { type: 'json_object' } : undefined,
      });

      const text = completion.choices[0]?.message?.content ?? '';
      return {
        text,
        usage: completion.usage
          ? {
              promptTokens: completion.usage.prompt_tokens,
              completionTokens: completion.usage.completion_tokens,
              totalTokens: completion.usage.total_tokens,
            }
          : undefined,
      };
    },

    async *generateContentStream(request: AIContentRequest): AsyncGenerator<AIStreamChunk> {
      const openai = await getClient(request.baseURL);
      const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
      if (request.system) messages.push({ role: 'system', content: request.system });
      messages.push({ role: 'user', content: request.prompt });

      const stream = await openai.chat.completions.create({
        model: request.model,
        messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxOutputTokens,
        stream: true,
      });

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content;
        if (text) yield { text };
      }
      yield { done: true };
    },

    async createChatSession(request: AIChatSessionRequest): Promise<ProviderChatSession> {
      const openai = await getClient(request.baseURL);
      const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
      if (request.system) messages.push({ role: 'system', content: request.system });
      for (const m of request.history ?? []) {
        messages.push({ role: m.role === 'model' ? 'system' : 'user', content: m.text });
      }

      return {
        async sendMessageStream({ message }) {
          const userMessages = [...messages, { role: 'user' as const, content: message }];
          const stream = await openai.chat.completions.create({
            model: request.model,
            messages: userMessages,
            temperature: request.temperature ?? 0.7,
            stream: true,
          });
          return (async function* () {
            for await (const chunk of stream) {
              const text = chunk.choices[0]?.delta?.content;
              if (text) yield { text };
            }
          })();
        },
      };
    },

    mapError: mapOpenAIError,

    async testConnection(): Promise<boolean> {
      const openai = await getClient();
      await openai.chat.completions.create({
        model: 'gpt-5',
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
      });
      return true;
    },

    reset: resetClient,
  };
}
