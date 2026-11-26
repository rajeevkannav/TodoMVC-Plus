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

  test('should handle CRUD operations', async ({ page }) => {
    const input = page.getByLabel('New todo text');
    await input.fill('Buy Milk');
    await input.press('Enter');
    
    await expect(page.getByText('Buy Milk')).toBeVisible();
    
    // Toggle
    await page.getByLabel('Mark "Buy Milk" as completed').click();
    await expect(page.getByText('Buy Milk')).toHaveClass(/line-through/);
    
    // Edit
    await page.getByText('Buy Milk').dblclick();
    await page.getByLabel('Edit todo text').fill('Buy Oat Milk');
    await page.getByLabel('Edit todo text').press('Enter');
    await expect(page.getByText('Buy Oat Milk')).toBeVisible();
    
    // Delete
    await page.getByLabel('Delete "Buy Oat Milk"').click();
    await expect(page.getByText('Buy Oat Milk')).not.toBeVisible();
  });

  test('should not have horizontal overflow at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.getByLabel('New todo text').fill('Long task name that might cause overflow if not handled correctly');
    await page.getByLabel('New todo text').press('Enter');
    
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(overflow).toBe(false);
  });

  test('should persist data on reload', async ({ page }) => {
    await page.getByLabel('New todo text').fill('Persistent Task');
    await page.getByLabel('New todo text').press('Enter');
    
    await page.reload();
    await expect(page.getByText('Persistent Task')).toBeVisible();
  });
});