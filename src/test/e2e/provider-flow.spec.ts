/**
 * Multi-provider Settings flow — provider dropdown + heuristic mode chrome.
 * Does not run live provider calls; selection UI only (mocked network unused).
 */
import { test, expect } from '@playwright/test';
import { navigateToView, skipOnboarding } from './e2eHelpers';

async function openAiConfiguration(page: import('@playwright/test').Page) {
  await navigateToView(page, '#settings');
  const aiTab = page.getByRole('tab', { name: /AI Configuration|KI-Konfiguration/i });
  await aiTab.waitFor({ state: 'visible', timeout: 10_000 });
  await aiTab.click();
  await page.locator('#ai-provider').waitFor({ state: 'visible', timeout: 10_000 });
}

test.describe('Provider selection flow', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
    await openAiConfiguration(page);
  });

  test('AI provider select lists all built-in providers', async ({ page }) => {
    const select = page.locator('#ai-provider');
    await expect(select).toBeVisible();
    const options = select.locator('option');
    await expect(options).toHaveCount(5);
    await expect(select.locator('option[value="gemini"]')).toHaveCount(1);
    await expect(select.locator('option[value="openai"]')).toHaveCount(1);
    await expect(select.locator('option[value="anthropic"]')).toHaveCount(1);
    await expect(select.locator('option[value="ollama"]')).toHaveCount(1);
    await expect(select.locator('option[value="heuristic"]')).toHaveCount(1);
  });

  test('switching provider updates the select value', async ({ page }) => {
    const select = page.locator('#ai-provider');
    for (const id of ['openai', 'anthropic', 'ollama', 'gemini'] as const) {
      await select.selectOption(id);
      await expect(select).toHaveValue(id);
    }
  });

  test('heuristic provider shows offline/non-AI description', async ({ page }) => {
    const select = page.locator('#ai-provider');
    await select.selectOption('heuristic');
    await expect(select).toHaveValue('heuristic');
    // Either availability message is fine — both prove the heuristic branch rendered.
    await expect(
      page
        .getByText(
          /non-ai programmatic research engine|determinist|offline|costs nothing|unavailable in this environment/i,
        )
        .first(),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('model field remains visible after provider change', async ({ page }) => {
    const select = page.locator('#ai-provider');
    await select.selectOption('openai');
    await expect(page.locator('#ai-model')).toBeVisible({ timeout: 5_000 });
    await select.selectOption('anthropic');
    await expect(page.locator('#ai-model')).toBeVisible({ timeout: 5_000 });
  });

  test('Ollama health panel diagnoses unavailable server', async ({ page }) => {
    await page.route('**/api/version', async (route) => {
      await route.abort('failed');
    });
    await page.route('**/api/tags', async (route) => {
      await route.abort('failed');
    });

    const select = page.locator('#ai-provider');
    await select.selectOption('ollama');
    await expect(page.getByTestId('ollama-health-panel')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('ollama-health-fail')).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText(/Local AI runs the model|Local AI führt das Modell/i),
    ).toBeVisible();
  });

  test('Ollama health panel lists discovered models when available', async ({ page }) => {
    await page.route('**/api/version', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ version: '0.5.0-e2e' }),
      });
    });
    await page.route('**/api/tags', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          models: [{ name: 'llama3.1:8b', details: { parameter_size: '8B' } }],
        }),
      });
    });

    const select = page.locator('#ai-provider');
    await select.selectOption('ollama');
    // Approve default loopback origin so the panel is the focus (URL field already defaults).
    const approve = page.getByRole('button', { name: /Approve|genehmigen/i });
    if (await approve.isVisible().catch(() => false)) {
      await approve.click();
    }
    await expect(page.getByTestId('ollama-health-ok')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('ollama-discovered-models')).toBeVisible();
    await expect(
      page.getByTestId('ollama-discovered-models').locator('option[value="llama3.1:8b"]'),
    ).toHaveCount(1);
  });
});
