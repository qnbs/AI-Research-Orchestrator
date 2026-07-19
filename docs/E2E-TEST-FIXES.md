# E2E Test Fixes Required

## Overview

Two E2E tests are currently failing. This document provides the exact fixes needed.

---

## Test 1: Knowledge Base Empty State

### Current Test (Failing)

```typescript
// src/test/e2e/agent-flow.spec.ts:268-275
test('KB shows empty-state message when no data saved', async ({ page }) => {
  await skipOnboarding(page);
  await navigateToView(page, '#knowledgeBase');
  await expect(
    page.getByText(/empty|no articles|save reports|start research/i).first(),
  ).toBeVisible({ timeout: 10_000 });
});
```

### Root Cause

The `skipOnboarding` function sets `aro.demoDataSeeded = '1'` which seeds demo data:

```typescript
// src/test/e2e/agent-flow.spec.ts:27-32
await page.evaluate(() => {
  try {
    localStorage.setItem('aro.demoDataDismissed', '1');
    localStorage.setItem('aro.demoDataSeeded', '1'); // ← This seeds 5 demo articles
  } catch {
    /* ignore */
  }
});
```

### Fix Option A: Test True Empty State

Remove the demo seeding before KB test:

```typescript
test('KB shows empty-state message when no data saved', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  // Skip onboarding WITHOUT seeding demo data
  await page.evaluate(() => {
    try {
      localStorage.setItem('aro.demoDataDismissed', '1');
      // Do NOT set aro.demoDataSeeded to test true empty state
    } catch {
      /* ignore */
    }
  });

  const startBtn = page.getByRole('button', { name: /start researching/i });
  const header = page.locator('header');
  await Promise.race([
    startBtn.waitFor({ state: 'visible', timeout: 15_000 }).then(() => startBtn.click()),
    header.waitFor({ state: 'visible', timeout: 15_000 }),
  ]);

  await navigateToView(page, '#knowledgeBase');
  await expect(
    page.getByText(/empty|no articles|save reports|start research/i).first(),
  ).toBeVisible({ timeout: 10_000 });
});
```

### Fix Option B: Test Demo-Seeded State

Update assertion to match demo-seeded state:

```typescript
test('KB shows demo data on first launch', async ({ page }) => {
  await skipOnboarding(page);
  await navigateToView(page, '#knowledgeBase');
  // Demo data seeds 5 articles
  await expect(page.getByText(/5 Articles Found/i).first()).toBeVisible({ timeout: 10_000 });
});
```

---

## Test 2: Invalid API Key Format

### Current Test (Failing)

```typescript
// src/test/e2e/agent-flow.spec.ts:406-412
test('invalid key format shows error after save', async ({ page }) => {
  const input = page.locator('#api-key-input');
  await input.fill('BAD_KEY');
  await page
    .getByRole('button', { name: /speichern/i }) // ← German text
    .first()
    .click();
  await expect(page.getByText(/ungültig|invalid|format|AIza/i).first()).toBeVisible({
    timeout: 5_000,
  });
});
```

### Root Cause

The test looks for German button text "Speichern" but the UI shows English "Save" because:

1. The app defaults to English
2. The button text is now using `t('apikey.save')` which returns "Save" in English

### Fix: Use Language-Agnostic Selector

```typescript
test('invalid key format shows error after save', async ({ page }) => {
  const input = page.locator('#api-key-input');
  await input.fill('BAD_KEY');

  // Click the save button by its accessible action, not text
  const saveBtn = page
    .locator('#api-key-input')
    .locator('xpath=following::button[contains(@class, "bg-brand-accent")][1]');
  await saveBtn.click();

  // Check for error message (works in both languages)
  await expect(page.getByText(/invalid|ungültig/i).first()).toBeVisible({
    timeout: 5_000,
  });
});
```

### Alternative Fix: Use Regex for Both Languages

```typescript
test('invalid key format shows error after save', async ({ page }) => {
  const input = page.locator('#api-key-input');
  await input.fill('BAD_KEY');

  // Match both "Save" and "Speichern"
  await page
    .getByRole('button', { name: /save|speichern/i })
    .first()
    .click();

  await expect(page.getByText(/invalid|ungültig/i).first()).toBeVisible({
    timeout: 5_000,
  });
});
```

---

## Summary of Required Changes

| File                              | Line    | Change                      |
| --------------------------------- | ------- | --------------------------- |
| `src/test/e2e/agent-flow.spec.ts` | 268-275 | Fix KB empty state test     |
| `src/test/e2e/agent-flow.spec.ts` | 406-412 | Fix API key button selector |

---

_Document created: 2026-07-18_
