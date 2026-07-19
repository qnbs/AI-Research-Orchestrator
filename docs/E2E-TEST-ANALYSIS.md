# E2E Test Analysis - Critical Findings

**Date:** 2026-07-19  
**Test Run:** 38 tests total, 3 failures (92% pass rate)

---

## Executive Summary

Three E2E tests are failing due to mismatches between test expectations and actual application behavior. This document provides a comprehensive analysis of each failure, root causes, and recommended fixes.

---

## Failure 1: Page Title Mismatch

### Test Location

`src/test/e2e/agent-flow.spec.ts:117-120`

### Current Test Code

```typescript
test('page has correct title', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveTitle(/AI Research Orchestration Author/i);
});
```

### Actual Behavior

- **Expected Pattern:** `/AI Research Orchestration Author/i`
- **Actual Title:** `"Home | Research Orchestrator"`

### Root Cause Analysis

1. **HTML Title Tag** (`index.html:14`): `<title>AI Research Orchestration Author</title>`
2. **Runtime Title Update** (`src/App.tsx:188`): `document.title = \`${viewTitles[currentView] || t('nav.research')} | ${t('app.name')}\``
3. **Translation Key** (`src/i18n/translations.ts:3`): `'app.name': 'Research Orchestrator'`
4. **View Title** (`src/i18n/translations.ts:10`): `'nav.home': 'Home'`

The test expects the static HTML title, but the application dynamically updates the title to include the current view name and app name.

### Evidence

```
Error: expect(page).toHaveTitle(expected) failed

Expected pattern: /AI Research Orchestration Author/i
Received string:  "Home | Research Orchestrator"
```

### Fix Options

**Option A: Update Test to Match Dynamic Title**

```typescript
test('page has correct title', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveTitle(/Home \| Research Orchestrator/i);
});
```

**Option B: Test Static Title Before App Hydration**

```typescript
test('page has correct title', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  // Check title before React hydration
  await expect(page).toHaveTitle(/AI Research Orchestration Author/i);
});
```

---

## Failure 2: Knowledge Base Empty State Not Detected

### Test Location

`src/test/e2e/agent-flow.spec.ts:327-338`

### Current Test Code

```typescript
test('KB shows empty-state message when no data saved', async ({ page }) => {
  // Clear any existing data to test true empty state
  await page.evaluate(() => {
    try {
      localStorage.removeItem('aro.demoDataSeeded');
      localStorage.removeItem('aro.demoDataDismissed');
    } catch {
      /* ignore */
    }
  });
  await navigateToView(page, '#knowledgeBase');
  await expect(
    page.getByText(/empty|no articles|save reports|start research/i).first(),
  ).toBeVisible({ timeout: 10_000 });
});
```

### Actual Behavior

- **Error:** `Locator: getByText(/empty|no articles|save reports|start research/i).first()` - Element not found
- **Timeout:** 10 seconds exceeded

### Root Cause Analysis

1. **skipOnboarding Function** (`src/test/e2e/agent-flow.spec.ts:27-32`): Sets `aro.demoDataSeeded = '1'` which seeds demo data
2. **KnowledgeBaseView Component** (`src/components/KnowledgeBaseView.tsx:51-54`): Shows hardcoded English strings
3. **EmptyState Component** (`src/components/EmptyState.tsx:25`): Renders title and message as plain text

The test attempts to clear localStorage, but the `navigateToView` helper may not properly handle the state transition, or the demo data seeding happens at a different layer.

### Evidence

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/empty|no articles|save reports|start research/i).first()
Expected: visible
Timeout: 10000ms
Error: element(s) not found
```

### Component Strings (Hardcoded - Not i18n)

```tsx
// src/components/KnowledgeBaseView.tsx:51-54
<EmptyState
  icon={<DatabaseIcon className="h-24 w-24" />}
  title="Your Knowledge Base is Empty"
  message="Save reports from the Orchestrator tab to start building your personal research library."
  action={{
    text: 'Start Research',
    ...
  }}
/>
```

### Fix Options

**Option A: Match Hardcoded Strings**

```typescript
test('KB shows empty-state message when no data saved', async ({ page }) => {
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
    page.getByText(/Your Knowledge Base is Empty|Knowledge Base is Empty/i).first(),
  ).toBeVisible({ timeout: 10_000 });
});
```

**Option B: Add i18n Keys and Update Test**

```typescript
// Add to translations.ts:
'knowledgebase.empty.title': 'Your Knowledge Base is Empty',
'knowledgebase.empty.message': 'Save reports from the Orchestrator tab to start building your personal research library.',
'knowledgebase.empty.action': 'Start Research',
```

---

## Failure 3: Invalid API Key Format Error Not Displayed

### Test Location

`src/test/e2e/agent-flow.spec.ts:413-420`

### Current Test Code

```typescript
test('invalid key format shows error after save', async ({ page }) => {
  const input = page.locator('#api-key-input');
  await input.fill('BAD_KEY');
  // Click the API key save button (matches both "Save" and "Speichern")
  await page
    .getByRole('button', { name: /save|speichern/i })
    .first()
    .click();
  await expect(page.getByText(/ungültig|invalid|format|AIza/i).first()).toBeVisible({
    timeout: 5_000,
  });
});
```

### Actual Behavior

- **Error:** Test timeout or element not found (incomplete in log)

### Root Cause Analysis

1. **Button Text** (`src/components/settings/ApiKeySettings.tsx:267`): Hardcoded `'Save'` and `'Save NCBI key'` - NOT using i18n
2. **Error Message** (`src/components/settings/ApiKeySettings.tsx:73`): Uses `t('apikey.invalid')` but key doesn't exist in translations
3. **Validation Function** (`src/services/apiKeyService.ts`): Validates format with `validateApiKeyFormat()`

### Evidence

The `apikey.*` translation keys referenced in `ApiKeySettings.tsx` do not exist in `src/i18n/translations.ts`. The component calls:

- `t('apikey.required')` - line 68
- `t('apikey.invalid')` - line 72
- `t('apikey.saved')` - line 80
- `t('apikey.save_failed')` - line 84
- `t('apikey.removed')` - line 92
- `t('apikey.remove_failed')` - line 96
- `t('apikey.ncbi.saved')` - line 107
- `t('apikey.ncbi.removed')` - line 111
- `t('apikey.ncbi.save_failed')` - line 117
- `t('apikey.ncbi.remove_failed')` - line 123
- `t('apikey.get_failed')` - line 133

None of these keys exist in the translations file.

### Missing Translation Keys

```typescript
// Required additions to src/i18n/translations.ts:
'apikey.required': 'API key is required.',
'apikey.invalid': 'Invalid API key format. Key must start with "AIza".',
'apikey.saved': 'API key saved successfully.',
'apikey.save_failed': 'Failed to save API key.',
'apikey.removed': 'API key removed.',
'apikey.remove_failed': 'Failed to remove API key.',
'apikey.ncbi.saved': 'NCBI API key saved.',
'apikey.ncbi.removed': 'NCBI API key removed.',
'apikey.ncbi.save_failed': 'Failed to save NCBI API key.',
'apikey.ncbi.remove_failed': 'Failed to remove NCBI API key.',
'apikey.get_failed': 'Failed to retrieve API key.',
```

### Fix Options

**Option A: Add Missing Translation Keys**
Add the missing `apikey.*` keys to both `en` and `de` sections in `src/i18n/translations.ts`.

**Option B: Update Test to Match Hardcoded Strings**

```typescript
test('invalid key format shows error after save', async ({ page }) => {
  const input = page.locator('#api-key-input');
  await input.fill('BAD_KEY');

  // Button has hardcoded "Save" text
  await page.getByRole('button', { name: /save/i }).first().click();

  // Error message appears in red text below input
  await expect(page.locator('.text-red-400').first()).toBeVisible({ timeout: 5_000 });
});
```

---

## Test Results Summary

| Test # | Suite                 | Test Name                                       | Status  | Issue                  |
| ------ | --------------------- | ----------------------------------------------- | ------- | ---------------------- |
| 1      | Application Bootstrap | page has correct title                          | ❌ FAIL | Title pattern mismatch |
| 2-38   | Various               | All other tests                                 | ✅ PASS | -                      |
| 19     | Knowledge Base View   | KB shows empty-state message when no data saved | ❌ FAIL | Element not found      |
| 25     | Settings — API Key    | invalid key format shows error after save       | ❌ FAIL | Missing i18n keys      |

---

## Additional Observations

### Hardcoded Strings in Settings Component

The `ApiKeySettings.tsx` component has multiple hardcoded English strings that should use i18n:

- Line 267: `'Save'` / `'Saving...'`
- Line 271: `'Remove'`
- Line 277: `'Save NCBI key'`
- Line 281: `'Remove'`

### Missing i18n Integration

The component imports `useTranslation` but the `apikey.*` keys are not defined, causing `t()` calls to return `undefined` or fallback values.

---

## Recommended Action Priority

1. **High:** Add missing `apikey.*` translation keys (fixes API key error display)
2. **Medium:** Update title test to match dynamic title behavior
3. **Medium:** Fix KB empty state test to properly clear demo data or match actual strings
4. **Low:** Refactor hardcoded strings in `ApiKeySettings.tsx` to use i18n

---

_Document created: 2026-07-19_
