import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleGenAI } from '@google/genai';

/**
 * Exercises the installed `@google/genai` transport (not the GoogleGenAI mock in
 * `gemini.test.ts`) by stubbing global `fetch`.
 */
describe('@google/genai installed SDK HTTP transport', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';

      if (method === 'POST' && /streamGenerateContent|:streamGenerateContent|alt=sse/i.test(url)) {
        const sse = 'data: {"candidates":[{"content":{"parts":[{"text":"stream-chunk"}]}}]}\n\n';
        return new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode(sse));
              controller.close();
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'text/event-stream' },
          },
        );
      }

      if (method === 'POST' && /generateContent|:generateContent/i.test(url)) {
        const body = JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'sdk-transport-ok' }] } }],
        });
        return new Response(body, {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response('unexpected request', { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('issues a non-streaming generateContent HTTP request', async () => {
    const ai = new GoogleGenAI({ apiKey: 'AIza-sdk-transport-test' });
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'ping',
    });

    expect(result.text).toContain('sdk-transport-ok');
    expect(fetchMock).toHaveBeenCalled();
    const calledUrl = String(fetchMock.mock.calls[0]?.[0] ?? '');
    expect(calledUrl).toMatch(/google/i);
  });

  it('issues a streaming generateContentStream HTTP request', async () => {
    const ai = new GoogleGenAI({ apiKey: 'AIza-sdk-transport-test' });
    const stream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: 'ping stream',
    });

    const chunks: string[] = [];
    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) chunks.push(text);
    }

    expect(chunks.join('')).toContain('stream');
    expect(fetchMock).toHaveBeenCalled();
  });
});
