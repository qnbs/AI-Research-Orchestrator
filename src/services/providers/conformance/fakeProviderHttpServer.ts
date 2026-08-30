/**
 * Local fake HTTP server for provider contract tests.
 *
 * Serves the Ollama `/api/generate`, OpenAI `/v1/chat/completions`, and
 * Anthropic `/v1/messages` shapes so adapters can be driven without vendor
 * networks. Not a production mock — tests own the scenario.
 */

import http from 'node:http';

export type ProviderHttpScenario = 'ok' | 'rate-limit' | 'unavailable' | 'malformed' | 'hang';

export interface FakeProviderHttpServer {
  origin: string;
  setScenario: (scenario: ProviderHttpScenario) => void;
  close: () => Promise<void>;
}

function isOpenAiCompletions(pathname: string): boolean {
  return pathname.endsWith('/chat/completions');
}

function isAnthropicMessages(pathname: string): boolean {
  return pathname.endsWith('/messages');
}

function isOllamaGenerate(pathname: string): boolean {
  return pathname === '/api/generate' || pathname.endsWith('/api/generate');
}

function okBody(pathname: string): unknown {
  if (isOllamaGenerate(pathname)) {
    return { response: 'hello from ollama', done: true };
  }
  if (isOpenAiCompletions(pathname)) {
    return {
      id: 'chatcmpl-conformance',
      object: 'chat.completion',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: 'hello from openai' },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    };
  }
  if (isAnthropicMessages(pathname)) {
    return {
      id: 'msg_conformance',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: 'hello from anthropic' }],
      model: 'claude-sonnet-4-5',
      stop_reason: 'end_turn',
      usage: { input_tokens: 1, output_tokens: 1 },
    };
  }
  return { error: `unexpected path ${pathname}` };
}

function rateLimitBody(pathname: string): unknown {
  if (isOpenAiCompletions(pathname)) {
    return {
      error: {
        message: 'Rate limit exceeded',
        type: 'rate_limit_exceeded',
        code: 'rate_limit_exceeded',
      },
    };
  }
  if (isAnthropicMessages(pathname)) {
    return { error: { type: 'rate_limit_error', message: 'Rate limited' } };
  }
  return { error: 'rate limited' };
}

function writeJson(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function pathnameOf(req: http.IncomingMessage): string {
  const raw = req.url ?? '/';
  try {
    return new URL(raw, 'http://127.0.0.1').pathname;
  } catch {
    return raw.split('?')[0] ?? '/';
  }
}

export async function startFakeProviderHttpServer(): Promise<FakeProviderHttpServer> {
  let scenario: ProviderHttpScenario = 'ok';
  const hanging: http.ServerResponse[] = [];

  const server = http.createServer((req, res) => {
    const pathname = pathnameOf(req);

    if (scenario === 'hang') {
      hanging.push(res);
      return;
    }

    req.resume();
    req.on('end', () => {
      if (scenario === 'rate-limit') {
        writeJson(res, 429, rateLimitBody(pathname));
        return;
      }
      if (scenario === 'unavailable') {
        writeJson(res, 500, { error: 'internal server error' });
        return;
      }
      if (scenario === 'malformed') {
        const broken = '{"broken":';
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(broken),
        });
        res.end(broken);
        return;
      }
      writeJson(res, 200, okBody(pathname));
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const addr = server.address();
  if (addr === null || typeof addr === 'string') {
    server.close();
    throw new Error('Fake provider HTTP server has no TCP address');
  }

  return {
    origin: `http://127.0.0.1:${addr.port}`,
    setScenario: (next) => {
      scenario = next;
    },
    close: () =>
      new Promise((resolve, reject) => {
        for (const res of hanging) {
          res.destroy();
        }
        hanging.length = 0;
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}
