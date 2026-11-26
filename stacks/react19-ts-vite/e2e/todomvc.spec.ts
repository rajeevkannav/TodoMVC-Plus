import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('TodoMVC+ E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should handle basic CRUD and persistence', async ({ page }) => {
    const input = page.getByPlaceholder('What needs to be done?');
    
    // Create
    await input.fill('Buy Milk');
    await input.press('Enter');
    await expect(page.getByText('Buy Milk', { exact: true })).toBeVisible();

    // Toggle
    await page.getByRole('checkbox', { name: 'Mark Buy Milk as completed', exact: true }).click();
    await expect(page.getByRole('checkbox', { name: 'Mark Buy Milk as active', exact: true })).toBeChecked();

    // Persistence
    await page.waitForTimeout(200);
    await page.reload();
    await expect(page.getByText('Buy Milk', { exact: true })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'Mark Buy Milk as active', exact: true })).toBeChecked();
  });

  test('should have zero a11y violations', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have horizontal overflow at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 600 });
    const input = page.getByPlaceholder('What needs to be done?');
    await input.fill('Very long task name that might cause overflow if not handled correctly');
    await input.press('Enter');

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(overflow).toBe(false);
  });

  test('should support undo/redo', async ({ page }) => {
    const input = page.getByPlaceholder('What needs to be done?');
    await input.fill('Task 1');
    await input.press('Enter');
    
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(page.getByText('Task 1', { exact: true })).not.toBeVisible();

    await page.getByRole('button', { name: 'Redo', exact: true }).click();
    await expect(page.getByText('Task 1', { exact: true })).toBeVisible();
  });
});
