/**
 * OpenAI-compatible provider adapter.
 *
 * Supports the official OpenAI API and OpenRouter-compatible endpoints via the
 * configurable `baseURL`. Streaming uses the SDK async iterator; JSON mode is
 * requested through `response_format: { type: 'json_object' }`.
 */

import { isAbortLikeError } from '../../lib/abortUtils';
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
import { providerCapabilities } from './types';

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

/** Newer OpenAI models (gpt-5.x, o1/o3/o4, …) reject `max_tokens` in favor of `max_completion_tokens`. */
function tokenLimitParams(
  model: string,
  maxOutputTokens: number | undefined,
): { max_tokens?: number; max_completion_tokens?: number } {
  if (maxOutputTokens === undefined) return {};
  const m = model.toLowerCase();
  const needsCompletionTokens =
    /^o[0-9]/.test(m) || /^gpt-5/.test(m) || /^gpt-4o/.test(m) || /^chatgpt-4o/.test(m);
  return needsCompletionTokens
    ? { max_completion_tokens: maxOutputTokens }
    : { max_tokens: maxOutputTokens };
}

function mapOpenAIError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  // AbortError / SDK APIUserAbortError must never be retried — user cancelled.
  if (isAbortLikeError(error)) {
    return new AppError({
      code: 'PROVIDER_UNAVAILABLE',
      message: error instanceof Error ? error.message : 'Aborted',
      retryable: false,
      cause: error,
    });
  }

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
    capabilities: providerCapabilities({
      supportsCustomBaseUrl: true,
      structuredOutput: { jsonObjectMode: true, nativeJsonSchema: false },
    }),

    async generateContent(request: AIContentRequest): Promise<AIContentResponse> {
      const openai = await getClient(request.baseURL);
      const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
      if (request.system) messages.push({ role: 'system', content: request.system });
      messages.push({ role: 'user', content: request.prompt });

      const completion = await openai.chat.completions.create(
        {
          model: request.model,
          messages,
          temperature: request.temperature ?? 0.7,
          ...tokenLimitParams(request.model, request.maxOutputTokens),
          response_format: request.json ? { type: 'json_object' } : undefined,
        },
        { signal: request.signal },
      );

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

      const stream = await openai.chat.completions.create(
        {
          model: request.model,
          messages,
          temperature: request.temperature ?? 0.7,
          ...tokenLimitParams(request.model, request.maxOutputTokens),
          stream: true,
        },
        { signal: request.signal },
      );

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content;
        if (text) yield { text };
      }
      yield { done: true };
    },

    async createChatSession(request: AIChatSessionRequest): Promise<ProviderChatSession> {
      const openai = await getClient(request.baseURL);
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
      if (request.system) messages.push({ role: 'system', content: request.system });
      for (const m of request.history ?? []) {
        messages.push({ role: m.role === 'model' ? 'assistant' : 'user', content: m.text });
      }

      return {
        async sendMessageStream({ message }) {
          const turnMessages = [...messages, { role: 'user' as const, content: message }];
          const stream = await openai.chat.completions.create(
            {
              model: request.model,
              messages: turnMessages,
              temperature: request.temperature ?? 0.7,
              stream: true,
            },
            { signal: request.signal },
          );
          return (async function* () {
            let assistant = '';
            for await (const chunk of stream) {
              const text = chunk.choices[0]?.delta?.content;
              if (text) {
                assistant += text;
                yield { text };
              }
            }
            // Commit the completed turn so subsequent sends keep multi-turn context.
            messages.push({ role: 'user', content: message });
            messages.push({ role: 'assistant', content: assistant });
          })();
        },
      };
    },

    mapError: mapOpenAIError,

    async testConnection(baseURL?: string): Promise<boolean> {
      const openai = await getClient(baseURL);
      await openai.chat.completions.create(
        {
          model: 'gpt-4.1-mini',
          messages: [{ role: 'user', content: 'ping' }],
          ...tokenLimitParams('gpt-4.1-mini', 1),
        },
        { signal: AbortSignal.timeout(15_000) },
      );
      return true;
    },

    reset: resetClient,
  };
}
