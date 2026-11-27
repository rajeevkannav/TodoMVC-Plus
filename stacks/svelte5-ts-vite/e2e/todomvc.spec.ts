import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('todo flow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 600 });
  await page.goto('/');
  
  const res = await new AxeBuilder({ page }).analyze();
  expect(res.violations).toEqual([]);

  await page.fill('input[name="todo"]', 'Test Task');
  await page.press('input[name="todo"]', 'Enter');
  await expect(page.locator('li')).toContainText('Test Task');

  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(320);
});