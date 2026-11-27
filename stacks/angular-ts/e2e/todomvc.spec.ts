import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('TodoMVC+ accessibility and reflow', async ({ page }) => {
  await page.goto('/');
  await page.setViewportSize({ width: 320, height: 800 });
  const res = await new AxeBuilder({ page }).analyze();
  expect(res.violations).toEqual([]);
  const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(320);
});