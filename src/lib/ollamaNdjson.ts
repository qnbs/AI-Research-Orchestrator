/**
 * Robust NDJSON stream reader for the Ollama HTTP API.
 *
 * Handles fragmented UTF-8/lines, enforces a max buffer, counts malformed
 * records, and always releases the body reader (including on abort).
 */

import { AppError } from './errors';

export const OLLAMA_NDJSON_DEFAULT_MAX_BUFFER_BYTES = 1_048_576;
export const OLLAMA_NDJSON_DEFAULT_MAX_MALFORMED = 5;

export type OllamaNdjsonOptions = {
  /** Abort when the unfinished line buffer exceeds this size. */
  maxBufferBytes?: number;
  /** Throw after this many non-blank JSON parse failures. */
  maxMalformedRecords?: number;
  signal?: AbortSignal;
};

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new AppError({
      code: 'STREAM_ABORTED',
      message: 'Ollama stream aborted',
      retryable: false,
      cause: signal.reason,
    });
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
  const { signal } = options;

  if (!response.body) return;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const utf8 = new TextEncoder();
  let buffer = '';
  let pendingBytes = 0;
  let malformed = 0;

  try {
    while (true) {
      throwIfAborted(signal);
      const { done, value } = await reader.read();
      throwIfAborted(signal);

      if (done) {
        buffer += decoder.decode();
        pendingBytes = utf8.encode(buffer).byteLength;
        break;
      }

      pendingBytes += value.byteLength;
      buffer += decoder.decode(value, { stream: true });
      if (pendingBytes > maxBufferBytes) {
        throw new AppError({
          code: 'PROVIDER_PARSE_FAILURE',
          message: `Ollama NDJSON buffer exceeded ${maxBufferBytes} bytes`,
          retryable: false,
          context: 'ollama_ndjson',
        });
      }

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      pendingBytes = utf8.encode(buffer).byteLength;
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
