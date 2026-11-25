import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('TodoMVC+ Accessibility and Reflow', () => {
  test('should load and pass axe accessibility audit', async ({ page }) => {
    await page.goto('/');
    
    // Check accessibility with axe
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should support adding and completing todos at 320px width without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto('/');

    // Check zero horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const innerWidth = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);

    // Add a todo
    const input = page.locator('input[aria-label="New todo text"]');
    await input.fill('Buy organic milk');
    await input.press('Enter');

    // Verify todo is added
    await expect(page.locator('text=Buy organic milk')).toBeVisible();

    // Toggle todo completed
    const checkbox = page.locator('input[aria-label*="Mark "Buy organic milk""]');
    await checkbox.click();

    // Verify completed state
    await expect(page.locator('text=1 item left')).toBeVisible();
  });
});
