/**
 * Playwright route helpers for Ollama `/api/version` + `/api/tags`.
 *
 * WebKit enforces CORS on fulfilled cross-origin responses even when Playwright
 * intercepts the request. Always attach ACAO headers and answer OPTIONS.
 */
import type { Page, Route } from '@playwright/test';

export const OLLAMA_E2E_LOOPBACK = 'http://127.0.0.1:11434';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

async function fulfillJson(route: Route, body: unknown, status = 200): Promise<void> {
  if (route.request().method() === 'OPTIONS') {
    await route.fulfill({ status: 204, headers: CORS_HEADERS });
    return;
  }
  await route.fulfill({
    status,
    contentType: 'application/json',
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  });
}

/** Mock a reachable Ollama with one discovered model. */
export async function mockOllamaHealthy(
  page: Page,
  options: { version?: string; modelName?: string; parameterSize?: string } = {},
): Promise<void> {
  const version = options.version ?? '0.5.0-e2e';
  const modelName = options.modelName ?? 'llama3.1:8b';
  const parameterSize = options.parameterSize ?? '8B';

  await page.route('**/api/version', async (route) => {
    await fulfillJson(route, { version });
  });
  await page.route('**/api/tags', async (route) => {
    await fulfillJson(route, {
      models: [{ name: modelName, details: { parameter_size: parameterSize } }],
    });
  });
}

/** Mock an unreachable Ollama (network failure on both probes). */
export async function mockOllamaUnavailable(page: Page): Promise<void> {
  await page.route('**/api/version', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS_HEADERS });
      return;
    }
    await route.abort('failed');
  });
  await page.route('**/api/tags', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS_HEADERS });
      return;
    }
    await route.abort('failed');
  });
}

/**
 * Point Settings at the E2E loopback origin, approve if prompted, and force a refresh.
 * Prefer 127.0.0.1 over localhost — WebKit/Playwright routing is more reliable.
 */
export async function configureOllamaLoopback(
  page: Page,
  baseUrl = OLLAMA_E2E_LOOPBACK,
): Promise<void> {
  const baseInput = page.locator('#ai-base-url');
  await baseInput.waitFor({ state: 'visible', timeout: 5_000 });
  await baseInput.fill(baseUrl);

  const approve = page.getByRole('button', { name: /Approve|genehmigen/i });
  if (await approve.isVisible().catch(() => false)) {
    await approve.click();
  }

  const refresh = page.getByTestId('ollama-health-refresh');
  await refresh.waitFor({ state: 'visible', timeout: 5_000 });
  await refresh.click();
}
