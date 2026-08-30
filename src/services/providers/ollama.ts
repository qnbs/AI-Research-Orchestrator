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

type OllamaTransportAbort = {
  /** Present when mapping a fetch/stream abort so timeout can be distinguished from cancel. */
  callerSignal?: AbortSignal | null;
};

function mapOllamaError(error: unknown, transport?: OllamaTransportAbort): AppError {
  if (error instanceof AppError) {
    if (transport && error.code === 'STREAM_ABORTED' && !transport.callerSignal?.aborted) {
      return new AppError({
        code: 'PROVIDER_UNAVAILABLE',
        message: 'Ollama request timed out',
        retryable: true,
        cause: error,
        context: 'ollama_wall_clock_timeout',
      });
    }
    return error;
  }
  if (isAbortError(error)) {
    if (transport && !transport.callerSignal?.aborted) {
      return new AppError({
        code: 'PROVIDER_UNAVAILABLE',
        message: 'Ollama request timed out',
        retryable: true,
        cause: error,
        context: 'ollama_wall_clock_timeout',
      });
    }
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

function throwBodyTooLarge(maxBytes: number, received: number, head: string): never {
  throw new AppError({
    code: 'PROVIDER_PARSE_FAILURE',
    message: `Ollama response exceeded ${maxBytes} bytes (${received} received): ${head}`,
    retryable: false,
    context: 'ollama_body_size',
  });
}

function decodePrefix(bytes: Uint8Array, maxBytes: number): string {
  return new TextDecoder().decode(bytes.subarray(0, Math.min(bytes.byteLength, maxBytes)));
}

async function readCappedFromStream(
  body: ReadableStream<Uint8Array>,
  maxBytes: number,
): Promise<string> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        const headChunks = [...chunks, value];
        const joined = new Uint8Array(Math.min(total, maxBytes));
        let offset = 0;
        for (const chunk of headChunks) {
          if (offset >= joined.byteLength) break;
          const take = Math.min(chunk.byteLength, joined.byteLength - offset);
          joined.set(chunk.subarray(0, take), offset);
          offset += take;
        }
        throwBodyTooLarge(maxBytes, total, new TextDecoder().decode(joined));
      }
      chunks.push(value);
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      // ignore cancel races after a completed/aborted body
    }
    try {
      reader.releaseLock();
    } catch {
      // releaseLock may be absent or already released in test doubles
    }
  }
  if (chunks.length === 0) return '';
  const joined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(joined);
}

function enforceUtf8Cap(text: string, maxBytes: number): string {
  const encoded = new TextEncoder().encode(text);
  if (encoded.byteLength > maxBytes) {
    throwBodyTooLarge(maxBytes, encoded.byteLength, decodePrefix(encoded, maxBytes));
  }
  return text;
}

/**
 * Read a non-stream Ollama body with a hard byte cap.
 * Prefers incremental `body.getReader()` so the cap is enforced before the
 * full payload is materialized. Falls back to `text()` then `json()` so
 * pipeline test doubles that only stub `json()` still work.
 */
async function readCappedText(response: Response, maxBytes: number): Promise<string> {
  if (response.body && typeof response.body.getReader === 'function') {
    return readCappedFromStream(response.body, maxBytes);
  }
  if (typeof response.text === 'function') {
    return enforceUtf8Cap(await response.text(), maxBytes);
  }
  if (typeof response.json === 'function') {
    let value: unknown;
    try {
      value = await response.json();
    } catch (cause) {
      throw new AppError({
        code: 'PROVIDER_PARSE_FAILURE',
        message: 'Ollama response body is unreadable',
        retryable: false,
        cause,
        context: 'ollama_body_size',
      });
    }
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    if (typeof text !== 'string') {
      throw new AppError({
        code: 'PROVIDER_PARSE_FAILURE',
        message: 'Ollama response body is unreadable',
        retryable: false,
        context: 'ollama_body_size',
      });
    }
    return enforceUtf8Cap(text, maxBytes);
  }
  throw new AppError({
    code: 'PROVIDER_PARSE_FAILURE',
    message: 'Ollama response body is unreadable',
    retryable: false,
    context: 'ollama_body_size',
  });
}

function ollamaResponseText(value: unknown): string {
  return typeof value === 'string' ? value : '';
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
      try {
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
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch (cause) {
          throw new AppError({
            code: 'PROVIDER_PARSE_FAILURE',
            message: 'Ollama generate returned invalid JSON',
            retryable: true,
            cause,
            context: 'ollama_body_json',
          });
        }
        if (!parsed || typeof parsed !== 'object') {
          throw new AppError({
            code: 'PROVIDER_PARSE_FAILURE',
            message: 'Ollama generate returned invalid JSON',
            retryable: true,
            context: 'ollama_body_json',
          });
        }
        const data = parsed as { response?: unknown; error?: unknown };
        if (typeof data.error === 'string' && data.error.length > 0) {
          throw mapOllamaError(new Error(data.error));
        }
        return { text: ollamaResponseText(data.response) };
      } catch (error) {
        throw mapOllamaError(error, { callerSignal: request.signal });
      }
    },

    async *generateContentStream(request: AIContentRequest): AsyncGenerator<AIStreamChunk> {
      const baseURL = getBaseUrl(request.baseURL);
      const fullPrompt = request.system ? `${request.system}\n\n${request.prompt}` : request.prompt;
      const streamSignal = combineAbortSignals(OLLAMA_STREAM_TOTAL_TIMEOUT_MS, request.signal);
      try {
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
          response?: unknown;
          error?: unknown;
          done?: boolean;
        }>(response, {
          signal: streamSignal,
          idleTimeoutMs: OLLAMA_NDJSON_DEFAULT_IDLE_TIMEOUT_MS,
          maxTotalBytes: OLLAMA_NDJSON_DEFAULT_MAX_TOTAL_BYTES,
        })) {
          if (typeof chunk.error === 'string' && chunk.error.length > 0) {
            throw mapOllamaError(new Error(chunk.error));
          }
          const text = ollamaResponseText(chunk.response);
          if (text) yield { text };
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
      } catch (error) {
        throw mapOllamaError(error, { callerSignal: request.signal });
      }
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
          try {
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
              try {
                for await (const chunk of streamOllamaNdjson<{
                  message?: { content?: unknown };
                  done?: boolean;
                  error?: unknown;
                }>(response, {
                  signal: streamSignal,
                  idleTimeoutMs: OLLAMA_NDJSON_DEFAULT_IDLE_TIMEOUT_MS,
                  maxTotalBytes: OLLAMA_NDJSON_DEFAULT_MAX_TOTAL_BYTES,
                })) {
                  if (typeof chunk.error === 'string' && chunk.error.length > 0) {
                    throw mapOllamaError(new Error(chunk.error));
                  }
                  const text = ollamaResponseText(chunk.message?.content);
                  if (text) {
                    assistant += text;
                    yield { text };
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
              } catch (error) {
                throw mapOllamaError(error, { callerSignal: request.signal });
              }
            })();
          } catch (error) {
            throw mapOllamaError(error, { callerSignal: request.signal });
          }
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
