/**
 * Multi-provider Settings flow — provider dropdown + heuristic mode chrome.
 * Ollama health probes are mocked (no live Local AI server required).
 */
import { test, expect } from '@playwright/test';
import { navigateToView, skipOnboarding } from './e2eHelpers';
import { configureOllamaLoopback, mockOllamaHealthy, mockOllamaUnavailable } from './ollamaMocks';

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
    await mockOllamaUnavailable(page);

    const select = page.locator('#ai-provider');
    await select.selectOption('ollama');
    await expect(page.getByTestId('ollama-health-panel')).toBeVisible({ timeout: 5_000 });
    await configureOllamaLoopback(page);
    await expect(page.getByTestId('ollama-health-fail')).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByText(/Local AI runs the model|Local AI führt das Modell/i),
    ).toBeVisible();
  });

  test('Ollama health panel lists discovered models when available', async ({ page }) => {
    await mockOllamaHealthy(page);

    const select = page.locator('#ai-provider');
    await select.selectOption('ollama');
    await expect(page.getByTestId('ollama-health-panel')).toBeVisible({ timeout: 5_000 });
    await configureOllamaLoopback(page);
    await expect(page.getByTestId('ollama-health-ok')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('ollama-discovered-models')).toBeVisible();
    await expect(
      page.getByTestId('ollama-discovered-models').locator('option[value="llama3.1:8b"]'),
    ).toHaveCount(1);
  });
});
