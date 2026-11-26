import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('TodoMVC+ E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have no accessibility violations', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should handle reflow at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    const input = page.getByLabel('New todo text');
    await input.fill('Reflow Test');
    await input.press('Enter');

    const body = page.locator('body');
    const scrollWidth = await body.evaluate(el => el.scrollWidth);
    const clientWidth = await body.evaluate(el => el.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('complete CRUD flow', async ({ page }) => {
    const input = page.getByLabel('New todo text');
    
    // Create
    await input.fill('Task 1');
    await input.press('Enter');
    await expect(page.getByText('Task 1', { exact: true })).toBeVisible();

    // Toggle
    await page.getByLabel('Mark as completed').click();
    await expect(page.getByText('0 items left', { exact: true })).toBeVisible();

    // Edit
    await page.getByText('Task 1', { exact: true }).dblclick();
    await page.keyboard.type(' Updated');
    await page.keyboard.press('Enter');
    await expect(page.getByText('Task 1 Updated', { exact: true })).toBeVisible();

    // Delete
    await page.getByLabel('Delete Task 1 Updated').click();
    await expect(page.getByText('Task 1 Updated', { exact: true })).not.toBeVisible();
  });

  test('persistence across reloads', async ({ page }) => {
    const input = page.getByLabel('New todo text');
    await input.fill('Persistent Task');
    await input.press('Enter');
    
    await page.reload();
    await expect(page.getByText('Persistent Task', { exact: true })).toBeVisible();
  });
});