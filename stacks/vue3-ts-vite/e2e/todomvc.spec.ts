import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('todo mvc flow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 600 });
  await page.goto('/');
  
  // Reflow check: ensure no horizontal overflow at 320px
  const isOverflowing = await page.evaluate(() => document.body.scrollWidth > document.documentElement.clientWidth);
  expect(isOverflowing).toBe(false);

  await page.fill('#new-todo', 'Test Task');
  await page.press('#new-todo', 'Enter');
  await expect(page.locator('li')).toContainText('Test Task');

  const res = await new AxeBuilder({ page }).analyze();
  expect(res.violations).toEqual([]);
});