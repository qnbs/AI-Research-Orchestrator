/**
 * Ollama local provider adapter.
 *
 * Uses plain fetch against the Ollama HTTP API (`/api/generate` and `/api/chat`).
 * No API key is required. Streaming reads NDJSON lines via `streamOllamaNdjson`.
 * JSON mode is requested via `format: 'json'` when `json: true` is set.
 */

import { AppError, isAbortError } from '../../lib/errors';
import { streamOllamaNdjson } from '../../lib/ollamaNdjson';
import type { AIProvider } from './provider';
import type {
  AIChatSessionRequest,
  AIContentRequest,
  AIContentResponse,
  AIStreamChunk,
  ProviderChatSession,
} from './types';
import { providerCapabilities } from './types';
import { probeOllamaHealth } from './ollamaHealth';

function getBaseUrl(requestBaseURL?: string): string {
  if (requestBaseURL) return requestBaseURL.replace(/\/$/, '');
  return 'http://localhost:11434';
}

function resetClient(): void {
  // no-op: Ollama provider is stateless aside from the optional base URL
}

function mapOllamaError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (isAbortError(error)) {
    return new AppError({
      code: 'STREAM_ABORTED',
      message: 'Ollama request aborted',
      retryable: false,
      cause: error,
    });
  }
  if (error instanceof Error) {
    const message = error.message;
    if (/model ['"`]?[\w.:+-]+['"`]? not found|file does not exist|pull model/i.test(message)) {
      return new AppError({
        code: 'PROVIDER_UNAVAILABLE',
        message: `Ollama model not found: ${message}`,
        retryable: false,
        cause: error,
        context: 'ollama_model_not_found',
      });
    }
    return new AppError({
      code: 'PROVIDER_UNAVAILABLE',
      message: `Ollama error: ${message}`,
      retryable: true,
      cause: error,
    });
  }
  return new AppError({
    code: 'PROVIDER_UNAVAILABLE',
    message: 'An unknown Ollama error occurred. Is the server running?',
    retryable: true,
    cause: error,
  });
}

function throwHttpError(status: number, text: string, label: string): never {
  // Require an explicit model-missing body — bare 404/proxy "Not Found" is not enough.
  const modelMissing =
    status >= 400 &&
    status < 500 &&
    /model ['"`]?[\w.:+-]+['"`]? not found|model .* not found|file does not exist/i.test(text);
  throw new AppError({
    code: status === 401 ? 'PROVIDER_AUTH' : 'PROVIDER_UNAVAILABLE',
    message: modelMissing
      ? `Ollama model not found (${label}): ${text}`
      : `Ollama ${label} responded with ${status}: ${text}`,
    retryable: !modelMissing && status >= 500,
    status,
    context: modelMissing ? 'ollama_model_not_found' : undefined,
  });
}

export function createOllamaProvider(): AIProvider {
  return {
    id: 'ollama',
    capabilities: providerCapabilities({
      requiresApiKey: false,
      supportsCustomBaseUrl: true,
      structuredOutput: { jsonObjectMode: true, nativeJsonSchema: false },
    }),

    async generateContent(request: AIContentRequest): Promise<AIContentResponse> {
      const baseURL = getBaseUrl(request.baseURL);
      const fullPrompt = request.system ? `${request.system}\n\n${request.prompt}` : request.prompt;
      const response = await fetch(`${baseURL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: request.model,
          prompt: fullPrompt,
          stream: false,
          format: request.json ? 'json' : undefined,
          options: {
            temperature: request.temperature ?? 0.7,
            num_predict: request.maxOutputTokens,
          },
        }),
        signal: request.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => 'Unknown error');
        throwHttpError(response.status, text, 'generate');
      }

      const data = (await response.json()) as { response?: string; error?: string };
      if (typeof data.error === 'string' && data.error.length > 0) {
        throw mapOllamaError(new Error(data.error));
      }
      return { text: data.response ?? '' };
    },

    async *generateContentStream(request: AIContentRequest): AsyncGenerator<AIStreamChunk> {
      const baseURL = getBaseUrl(request.baseURL);
      const fullPrompt = request.system ? `${request.system}\n\n${request.prompt}` : request.prompt;
      const response = await fetch(`${baseURL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: request.model,
          prompt: fullPrompt,
          stream: true,
          format: request.json ? 'json' : undefined,
          options: {
            temperature: request.temperature ?? 0.7,
            num_predict: request.maxOutputTokens,
          },
        }),
        signal: request.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => 'Unknown error');
        throwHttpError(response.status, text, 'generate stream');
      }

      for await (const chunk of streamOllamaNdjson<{ response?: string; error?: string }>(
        response,
        { signal: request.signal },
      )) {
        if (typeof chunk.error === 'string' && chunk.error.length > 0) {
          throw mapOllamaError(new Error(chunk.error));
        }
        if (chunk.response) yield { text: chunk.response };
      }
      yield { done: true };
    },

    async createChatSession(request: AIChatSessionRequest): Promise<ProviderChatSession> {
      const baseURL = getBaseUrl(request.baseURL);
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
      if (request.system) messages.push({ role: 'system', content: request.system });
      for (const m of request.history ?? []) {
        messages.push({ role: m.role === 'model' ? 'assistant' : 'user', content: m.text });
      }

      return {
        async sendMessageStream({ message }) {
          const chatMessages = [...messages, { role: 'user' as const, content: message }];
          const response = await fetch(`${baseURL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: request.model,
              messages: chatMessages,
              stream: true,
              options: { temperature: request.temperature ?? 0.7 },
            }),
            signal: request.signal,
          });

          if (!response.ok) {
            const text = await response.text().catch(() => 'Unknown error');
            throwHttpError(response.status, text, 'chat');
          }

          return (async function* () {
            let assistant = '';
            let completed = false;
            for await (const chunk of streamOllamaNdjson<{
              message?: { content?: string };
              done?: boolean;
              error?: string;
            }>(response, { signal: request.signal })) {
              if (typeof chunk.error === 'string' && chunk.error.length > 0) {
                throw mapOllamaError(new Error(chunk.error));
              }
              if (chunk.message?.content) {
                assistant += chunk.message.content;
                yield { text: chunk.message.content };
              }
              if (chunk.done === true) {
                completed = true;
              }
            }
            if (!completed) {
              throw new AppError({
                code: 'PROVIDER_UNAVAILABLE',
                message: 'Ollama chat stream ended without a done marker',
                retryable: true,
              });
            }
            // Commit only after a protocol-complete stream so failed turns
            // never poison multi-turn context.
            messages.push({ role: 'user', content: message });
            messages.push({ role: 'assistant', content: assistant });
          })();
        },
      };
    },

    mapError: mapOllamaError,

    async testConnection(baseURL?: string): Promise<boolean> {
      const result = await probeOllamaHealth(baseURL, { force: true });
      return result.ok;
    },

    reset: resetClient,
  };
}
