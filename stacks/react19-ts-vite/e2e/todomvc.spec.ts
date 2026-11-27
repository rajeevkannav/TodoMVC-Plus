import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('has title and accessibility', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/TodoMVC+/);
  
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  expect(accessibilityScanResults.violations).toEqual([]);
});

test('zero-horizontal-overflow at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 600 });
  await page.goto('/');
  const isOverflowing = await page.evaluate(() => document.body.scrollWidth > document.documentElement.clientWidth);
  expect(isOverflowing).toBe(false);
});