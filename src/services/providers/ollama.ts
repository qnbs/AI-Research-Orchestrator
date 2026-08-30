/**
 * Ollama local provider adapter.
 *
 * Uses plain fetch against the Ollama HTTP API (`/api/generate` and `/api/chat`).
 * No API key is required. Streaming reads NDJSON lines via `streamOllamaNdjson`.
 * JSON mode is requested via `format: 'json'` when `json: true` is set.
 */

import { AppError, isAbortError } from '../../lib/errors';
import { combineAbortSignals } from '../../lib/abortUtils';
import {
  OLLAMA_NDJSON_DEFAULT_IDLE_TIMEOUT_MS,
  OLLAMA_NDJSON_DEFAULT_MAX_TOTAL_BYTES,
  streamOllamaNdjson,
} from '../../lib/ollamaNdjson';
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

/** Headers/connect budget for non-stream generate. Stream body uses idle + total caps. */
export const OLLAMA_FETCH_TIMEOUT_MS = 15_000;
/** Wall-clock cap for one generate/chat NDJSON stream (headers + body). */
export const OLLAMA_STREAM_TOTAL_TIMEOUT_MS = 300_000;
export const OLLAMA_MAX_ERROR_BODY_BYTES = 65_536;
export const OLLAMA_MAX_NONSTREAM_BODY_BYTES = 2_097_152;

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

async function readCappedText(response: Response, maxBytes: number): Promise<string> {
  if (typeof response.arrayBuffer === 'function') {
    const buf = new Uint8Array(await response.arrayBuffer());
    if (buf.byteLength > maxBytes) {
      const head = new TextDecoder().decode(buf.subarray(0, maxBytes));
      throw new AppError({
        code: 'PROVIDER_PARSE_FAILURE',
        message: `Ollama response exceeded ${maxBytes} bytes (${buf.byteLength} received): ${head}`,
        retryable: false,
        context: 'ollama_body_size',
      });
    }
    return new TextDecoder().decode(buf);
  }
  if (typeof response.text === 'function') {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > maxBytes) {
      throw new AppError({
        code: 'PROVIDER_PARSE_FAILURE',
        message: `Ollama response exceeded ${maxBytes} bytes`,
        retryable: false,
        context: 'ollama_body_size',
      });
    }
    return text;
  }
  throw new AppError({
    code: 'PROVIDER_PARSE_FAILURE',
    message: 'Ollama response body is unreadable',
    retryable: false,
    context: 'ollama_body_size',
  });
}

async function readErrorBody(response: Response): Promise<string> {
  try {
    return await readCappedText(response, OLLAMA_MAX_ERROR_BODY_BYTES);
  } catch (err) {
    if (err instanceof AppError && err.code === 'PROVIDER_PARSE_FAILURE') throw err;
    return 'Unknown error';
  }
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
        signal: combineAbortSignals(OLLAMA_FETCH_TIMEOUT_MS, request.signal),
      });

      if (!response.ok) {
        const text = await readErrorBody(response);
        throwHttpError(response.status, text, 'generate');
      }

      const raw = await readCappedText(response, OLLAMA_MAX_NONSTREAM_BODY_BYTES);
      let data: { response?: string; error?: string };
      try {
        data = JSON.parse(raw) as { response?: string; error?: string };
      } catch (cause) {
        throw new AppError({
          code: 'PROVIDER_PARSE_FAILURE',
          message: 'Ollama generate returned invalid JSON',
          retryable: true,
          cause,
          context: 'ollama_body_json',
        });
      }
      if (typeof data.error === 'string' && data.error.length > 0) {
        throw mapOllamaError(new Error(data.error));
      }
      return { text: data.response ?? '' };
    },

    async *generateContentStream(request: AIContentRequest): AsyncGenerator<AIStreamChunk> {
      const baseURL = getBaseUrl(request.baseURL);
      const fullPrompt = request.system ? `${request.system}\n\n${request.prompt}` : request.prompt;
      const streamSignal = combineAbortSignals(OLLAMA_STREAM_TOTAL_TIMEOUT_MS, request.signal);
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
        signal: streamSignal,
      });

      if (!response.ok) {
        const text = await readErrorBody(response);
        throwHttpError(response.status, text, 'generate stream');
      }

      let completed = false;
      for await (const chunk of streamOllamaNdjson<{
        response?: string;
        error?: string;
        done?: boolean;
      }>(response, {
        signal: streamSignal,
        idleTimeoutMs: OLLAMA_NDJSON_DEFAULT_IDLE_TIMEOUT_MS,
        maxTotalBytes: OLLAMA_NDJSON_DEFAULT_MAX_TOTAL_BYTES,
      })) {
        if (typeof chunk.error === 'string' && chunk.error.length > 0) {
          throw mapOllamaError(new Error(chunk.error));
        }
        if (chunk.response) yield { text: chunk.response };
        if (chunk.done === true) {
          completed = true;
        }
      }
      if (!completed) {
        throw new AppError({
          code: 'PROVIDER_UNAVAILABLE',
          message: 'Ollama generate stream ended without a done marker',
          retryable: true,
        });
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
          const streamSignal = combineAbortSignals(OLLAMA_STREAM_TOTAL_TIMEOUT_MS, request.signal);
          const response = await fetch(`${baseURL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: request.model,
              messages: chatMessages,
              stream: true,
              options: { temperature: request.temperature ?? 0.7 },
            }),
            signal: streamSignal,
          });

          if (!response.ok) {
            const text = await readErrorBody(response);
            throwHttpError(response.status, text, 'chat');
          }

          return (async function* () {
            let assistant = '';
            let completed = false;
            for await (const chunk of streamOllamaNdjson<{
              message?: { content?: string };
              done?: boolean;
              error?: string;
            }>(response, {
              signal: streamSignal,
              idleTimeoutMs: OLLAMA_NDJSON_DEFAULT_IDLE_TIMEOUT_MS,
              maxTotalBytes: OLLAMA_NDJSON_DEFAULT_MAX_TOTAL_BYTES,
            })) {
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
