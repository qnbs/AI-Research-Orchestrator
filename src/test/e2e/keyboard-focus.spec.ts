import { test, expect } from '@playwright/test';

/**
 * WS-E keyboard focus walk — ensures Tab moves focus and the focused control
 * keeps a visible indicator (outline and/or box-shadow from --focus-ring /
 * Tailwind focus-visible:ring / .focus-ring-aa / .glass-input:focus).
 */
test.describe('Keyboard focus visibility (WS-E)', () => {
  test('Tab focuses interactive chrome with a visible ring', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Move focus into the document chrome; skip non-interactive body.
    await page.keyboard.press('Tab');

    const focused = page.locator(':focus');
    await expect(focused).toBeVisible({ timeout: 5000 });

    const indicator = await focused.evaluate((el) => {
      const cs = getComputedStyle(el);
      const outlineVisible =
        cs.outlineStyle !== 'none' &&
        cs.outlineWidth !== '0px' &&
        cs.outlineColor !== 'rgba(0, 0, 0, 0)';
      const shadowVisible = cs.boxShadow !== 'none' && cs.boxShadow !== '';
      // Tailwind ring utilities paint via box-shadow; also accept outline from :focus-visible.
      return { outlineVisible, shadowVisible, tag: el.tagName.toLowerCase() };
    });

    expect(
      indicator.outlineVisible || indicator.shadowVisible,
      `Focused <${indicator.tag}> has neither outline nor box-shadow focus indicator`,
    ).toBe(true);

    // Walk a few more tabs — each focusable stop should keep an indicator.
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      const next = page.locator(':focus');
      if ((await next.count()) === 0) break;
      const ok = await next.evaluate((el) => {
        const cs = getComputedStyle(el);
        const outlineVisible =
          cs.outlineStyle !== 'none' &&
          cs.outlineWidth !== '0px' &&
          cs.outlineColor !== 'rgba(0, 0, 0, 0)';
        const shadowVisible = cs.boxShadow !== 'none' && cs.boxShadow !== '';
        return outlineVisible || shadowVisible;
      });
      expect(ok, `Tab stop ${i + 2} lost visible focus indicator`).toBe(true);
    }
  });
});
