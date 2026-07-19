/**
 * Ollama local provider adapter.
 *
 * Uses plain fetch against the Ollama HTTP API (`/api/generate` and `/api/chat`).
 * No API key is required. Streaming reads NDJSON lines. JSON mode is requested
 * via `format: 'json'` when `json: true` is set on the request.
 */

import { AppError } from '../../lib/errors';
import type { AIProvider } from './provider';
import type {
  AIChatSessionRequest,
  AIContentRequest,
  AIContentResponse,
  AIStreamChunk,
  ProviderChatSession,
} from './types';

function getBaseUrl(requestBaseURL?: string): string {
  if (requestBaseURL) return requestBaseURL.replace(/\/$/, '');
  return 'http://localhost:11434';
}

function resetClient(): void {
  // no-op: Ollama provider is stateless aside from the optional base URL
}

function mapOllamaError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error) {
    return new AppError({
      code: 'PROVIDER_UNAVAILABLE',
      message: `Ollama error: ${error.message}`,
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

async function* streamNdjson<
  T extends { done?: boolean; response?: string; message?: { content?: string } },
>(response: Response): AsyncGenerator<T> {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        yield JSON.parse(line) as T;
      } catch {
        // ignore malformed lines
      }
    }
  }
  if (buffer.trim()) {
    try {
      yield JSON.parse(buffer) as T;
    } catch {
      // ignore trailing malformed line
    }
  }
}

export function createOllamaProvider(): AIProvider {
  return {
    id: 'ollama',
    capabilities: {
      streaming: true,
      jsonMode: true,
      webGrounding: false,
      chat: true,
      requiresApiKey: false,
    },

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
        throw new AppError({
          code: response.status === 401 ? 'PROVIDER_AUTH' : 'PROVIDER_UNAVAILABLE',
          message: `Ollama responded with ${response.status}: ${text}`,
          retryable: response.status >= 500,
          status: response.status,
        });
      }

      const data = (await response.json()) as { response?: string };
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
        throw new AppError({
          code: response.status === 401 ? 'PROVIDER_AUTH' : 'PROVIDER_UNAVAILABLE',
          message: `Ollama responded with ${response.status}: ${text}`,
          retryable: response.status >= 500,
          status: response.status,
        });
      }

      for await (const chunk of streamNdjson<{ response?: string }>(response)) {
        if (chunk.response) yield { text: chunk.response };
      }
      yield { done: true };
    },

    async createChatSession(request: AIChatSessionRequest): Promise<ProviderChatSession> {
      const baseURL = getBaseUrl(request.baseURL);
      const messages = (request.history ?? []).map((m) => ({
        role: m.role === 'model' ? ('assistant' as const) : ('user' as const),
        content: m.text,
      }));

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
          });

          if (!response.ok) {
            const text = await response.text().catch(() => 'Unknown error');
            throw new AppError({
              code: response.status === 401 ? 'PROVIDER_AUTH' : 'PROVIDER_UNAVAILABLE',
              message: `Ollama chat responded with ${response.status}: ${text}`,
              retryable: response.status >= 500,
              status: response.status,
            });
          }

          return (async function* () {
            for await (const chunk of streamNdjson<{ message?: { content?: string } }>(response)) {
              if (chunk.message?.content) yield { text: chunk.message.content };
            }
          })();
        },
      };
    },

    mapError: mapOllamaError,

    async testConnection(): Promise<boolean> {
      const baseURL = getBaseUrl();
      const response = await fetch(`${baseURL}/api/tags`);
      return response.ok;
    },

    reset: resetClient,
  };
}
