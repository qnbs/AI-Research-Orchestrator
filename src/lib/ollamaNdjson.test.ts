import { describe, it, expect, vi } from 'vitest';
import { streamOllamaNdjson } from './ollamaNdjson';

function mockResponse(chunks: string[], opts?: { cancel?: () => void }): Response {
  const encoder = new TextEncoder();
  let i = 0;
  const cancel = opts?.cancel ?? vi.fn();
  return {
    body: {
      getReader: () => ({
        read: async () => {
          if (i >= chunks.length) return { done: true, value: undefined };
          return { done: false, value: encoder.encode(chunks[i++]) };
        },
        cancel,
        releaseLock: vi.fn(),
      }),
    },
  } as unknown as Response;
}

describe('streamOllamaNdjson', () => {
  it('parses fragmented lines across chunks', async () => {
    const response = mockResponse(['{"response":"he', 'llo"}\n{"response":"!",', '"done":true}\n']);
    const items: Array<{ response?: string }> = [];
    for await (const item of streamOllamaNdjson<{ response?: string }>(response)) {
      items.push(item);
    }
    expect(items).toEqual([{ response: 'hello' }, { response: '!', done: true }]);
  });

  it('skips blank lines and tolerates a few malformed records', async () => {
    const response = mockResponse(['\n', 'not-json\n', '{"ok":true}\n', '\n']);
    const items: Array<{ ok?: boolean }> = [];
    for await (const item of streamOllamaNdjson<{ ok?: boolean }>(response)) {
      items.push(item);
    }
    expect(items).toEqual([{ ok: true }]);
  });

  it('throws after exceeding the malformed-record threshold', async () => {
    const response = mockResponse(['a\n', 'b\n', 'c\n']);
    await expect(async () => {
      for await (const _ of streamOllamaNdjson(response, { maxMalformedRecords: 2 })) {
        // drain
      }
    }).rejects.toMatchObject({ code: 'PROVIDER_PARSE_FAILURE' });
  });

  it('throws when the unfinished buffer exceeds the max size', async () => {
    const response = mockResponse(['{"x":"' + 'y'.repeat(100)]);
    await expect(async () => {
      for await (const _ of streamOllamaNdjson(response, { maxBufferBytes: 50 })) {
        // drain
      }
    }).rejects.toMatchObject({ code: 'PROVIDER_PARSE_FAILURE' });
  });

  it('cancels the reader in finally and respects abort', async () => {
    const cancel = vi.fn();
    const response = mockResponse(['{"a":1}\n'], { cancel });
    const controller = new AbortController();
    controller.abort();
    await expect(async () => {
      for await (const _ of streamOllamaNdjson(response, { signal: controller.signal })) {
        // drain
      }
    }).rejects.toMatchObject({ code: 'STREAM_ABORTED' });
    expect(cancel).toHaveBeenCalled();
  });

  it('throws when a chunk stalls past idleTimeoutMs', async () => {
    vi.useFakeTimers();
    const cancel = vi.fn();
    const response = {
      body: {
        getReader: () => ({
          read: () => new Promise<{ done: boolean; value?: Uint8Array }>(() => {}),
          cancel,
          releaseLock: vi.fn(),
        }),
      },
    } as unknown as Response;
    try {
      const pending = (async () => {
        for await (const _ of streamOllamaNdjson(response, { idleTimeoutMs: 25 })) {
          // drain
        }
      })();
      const expectation = expect(pending).rejects.toMatchObject({
        code: 'PROVIDER_UNAVAILABLE',
        context: 'ollama_idle_timeout',
      });
      await vi.advanceTimersByTimeAsync(30);
      await expectation;
      expect(cancel).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('throws when accumulated stream bytes exceed maxTotalBytes', async () => {
    const response = mockResponse(['{"a":1}\n', '{"b":2}\n']);
    await expect(async () => {
      for await (const _ of streamOllamaNdjson(response, { maxTotalBytes: 8 })) {
        // drain
      }
    }).rejects.toMatchObject({ code: 'PROVIDER_PARSE_FAILURE', context: 'ollama_stream_size' });
  });
});
