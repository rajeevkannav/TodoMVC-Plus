import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('TodoMVC+ E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should pass accessibility tests', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should handle reflow at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.fill('input[name="new-todo"]', 'Reflow Test Task');
    await page.keyboard.press('Enter');
    
    const bodyWidth = await page.evaluate(() => document.body.clientWidth);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    
    expect(scrollWidth).toBeLessThanOrEqual(bodyWidth);
  });

  test('should persist data after reload', async ({ page }) => {
    await page.fill('input[name="new-todo"]', 'Persistent Task');
    await page.keyboard.press('Enter');
    
    await page.reload();
    await expect(page.getByText('Persistent Task', { exact: true })).toBeVisible();
  });

  test('should support undo/redo', async ({ page }) => {
    await page.fill('input[name="new-todo"]', 'Undo Task');
    await page.keyboard.press('Enter');
    
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByText('Undo Task', { exact: true })).not.toBeVisible();
    
    await page.getByRole('button', { name: 'Redo' }).click();
    await expect(page.getByText('Undo Task', { exact: true })).toBeVisible();
  });
});