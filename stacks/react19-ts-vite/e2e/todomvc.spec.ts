import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('TodoMVC+ E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have no accessibility violations', async ({ page }) => {
    const res = await new AxeBuilder({ page }).analyze();
    expect(res.violations).toEqual([]);
  });

  test('should handle CRUD and persistence', async ({ page }) => {
    const input = page.getByPlaceholder('What needs to be done?', { exact: true });
    await input.fill('Test Persistence');
    await input.press('Enter');

    await expect(page.getByText('Test Persistence', { exact: true })).toBeVisible();

    await page.waitForTimeout(200);
    await page.reload();

    await expect(page.getByText('Test Persistence', { exact: true })).toBeVisible();
  });

  test('should not have horizontal overflow at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 600 });
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(overflow).toBe(false);
  });
});