/**
 * Robust NDJSON stream reader for the Ollama HTTP API.
 *
 * Handles fragmented UTF-8/lines, enforces a max buffer, counts malformed
 * records, and always releases the body reader (including on abort).
 */

import { isTimeoutAbortReason } from './abortUtils';
import { AppError } from './errors';

export const OLLAMA_NDJSON_DEFAULT_MAX_BUFFER_BYTES = 1_048_576;
export const OLLAMA_NDJSON_DEFAULT_MAX_MALFORMED = 5;
/** Stall between body chunks (generate/chat streams). */
export const OLLAMA_NDJSON_DEFAULT_IDLE_TIMEOUT_MS = 30_000;
/** Accumulated NDJSON bytes for one generate/chat stream. */
export const OLLAMA_NDJSON_DEFAULT_MAX_TOTAL_BYTES = 8_388_608;

export type OllamaNdjsonOptions = {
  /** Abort when the unfinished line buffer exceeds this size. */
  maxBufferBytes?: number;
  /** Throw after this many non-blank JSON parse failures. */
  maxMalformedRecords?: number;
  /** Abort if `reader.read()` does not resolve within this many ms. Unset = no idle cap. */
  idleTimeoutMs?: number;
  /** Abort if decoded body bytes across the stream exceed this size. Unset = no total cap. */
  maxTotalBytes?: number;
  signal?: AbortSignal;
};

function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  if (isTimeoutAbortReason(signal.reason)) {
    throw new AppError({
      code: 'PROVIDER_UNAVAILABLE',
      message: 'Ollama stream exceeded wall-clock timeout',
      retryable: true,
      cause: signal.reason,
      context: 'ollama_wall_clock_timeout',
    });
  }
  throw new AppError({
    code: 'STREAM_ABORTED',
    message: 'Ollama stream aborted',
    retryable: false,
    cause: signal.reason,
  });
}

async function readWithIdleTimeout(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  idleTimeoutMs: number | undefined,
  signal?: AbortSignal,
): Promise<ReadableStreamReadResult<Uint8Array>> {
  if (idleTimeoutMs === undefined) {
    return reader.read();
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const idle = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new AppError({
          code: 'PROVIDER_UNAVAILABLE',
          message: `Ollama stream idle for ${idleTimeoutMs}ms`,
          retryable: true,
          context: 'ollama_idle_timeout',
        }),
      );
    }, idleTimeoutMs);
  });
  const onAbort = () => {
    if (timer !== undefined) clearTimeout(timer);
  };
  signal?.addEventListener('abort', onAbort, { once: true });
  try {
    return await Promise.race([reader.read(), idle]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

/**
 * Yield parsed NDJSON objects from an HTTP response body.
 * Blank lines are skipped. Malformed non-blank lines increment a counter and
 * are skipped until `maxMalformedRecords` is exceeded.
 */
export async function* streamOllamaNdjson<T>(
  response: Response,
  options: OllamaNdjsonOptions = {},
): AsyncGenerator<T> {
  const maxBufferBytes = options.maxBufferBytes ?? OLLAMA_NDJSON_DEFAULT_MAX_BUFFER_BYTES;
  const maxMalformed = options.maxMalformedRecords ?? OLLAMA_NDJSON_DEFAULT_MAX_MALFORMED;
  const idleTimeoutMs = options.idleTimeoutMs;
  const maxTotalBytes = options.maxTotalBytes;
  const { signal } = options;

  if (!response.body) return;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const utf8 = new TextEncoder();
  let buffer = '';
  let pendingBytes = 0;
  let malformed = 0;
  let totalBytes = 0;

  try {
    while (true) {
      throwIfAborted(signal);
      const { done, value } = await readWithIdleTimeout(reader, idleTimeoutMs, signal);
      throwIfAborted(signal);
      if (value && maxTotalBytes !== undefined) {
        totalBytes += value.byteLength;
        if (totalBytes > maxTotalBytes) {
          throw new AppError({
            code: 'PROVIDER_PARSE_FAILURE',
            message: `Ollama stream exceeded ${maxTotalBytes} bytes`,
            retryable: false,
            context: 'ollama_stream_size',
          });
        }
      }

      if (done) {
        buffer += decoder.decode();
        pendingBytes = utf8.encode(buffer).byteLength;
        if (pendingBytes > maxBufferBytes) {
          throw new AppError({
            code: 'PROVIDER_PARSE_FAILURE',
            message: `Ollama NDJSON buffer exceeded ${maxBufferBytes} bytes`,
            retryable: false,
            context: 'ollama_ndjson',
          });
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      // Bound only the unfinished line — complete NDJSON records are yielded and discarded.
      pendingBytes = utf8.encode(buffer).byteLength;
      if (pendingBytes > maxBufferBytes) {
        throw new AppError({
          code: 'PROVIDER_PARSE_FAILURE',
          message: `Ollama NDJSON buffer exceeded ${maxBufferBytes} bytes`,
          retryable: false,
          context: 'ollama_ndjson',
        });
      }
      for (const line of lines) {
        const parsed = parseLine<T>(line, () => {
          malformed += 1;
          if (malformed > maxMalformed) {
            throw new AppError({
              code: 'PROVIDER_PARSE_FAILURE',
              message: `Ollama NDJSON exceeded ${maxMalformed} malformed records`,
              retryable: true,
              context: 'ollama_ndjson',
            });
          }
        });
        if (parsed !== undefined) yield parsed;
      }
    }

    if (buffer.trim()) {
      const parsed = parseLine<T>(buffer, () => {
        malformed += 1;
        if (malformed > maxMalformed) {
          throw new AppError({
            code: 'PROVIDER_PARSE_FAILURE',
            message: `Ollama NDJSON exceeded ${maxMalformed} malformed records`,
            retryable: true,
            context: 'ollama_ndjson',
          });
        }
      });
      if (parsed !== undefined) yield parsed;
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      // ignore cancel races after a completed/aborted stream
    }
    try {
      reader.releaseLock();
    } catch {
      // releaseLock may be absent or already released in test doubles
    }
  }
}

function parseLine<T>(line: string, onMalformed: () => void): T | undefined {
  if (!line.trim()) return undefined;
  try {
    return JSON.parse(line) as T;
  } catch {
    onMalformed();
    return undefined;
  }
}
