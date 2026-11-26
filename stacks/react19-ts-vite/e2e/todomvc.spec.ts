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

  test('should handle CRUD flow', async ({ page }) => {
    const input = page.getByPlaceholder('What needs to be done?');
    await input.fill('Buy Milk');
    await input.press('Enter');
    
    await expect(page.getByText('Buy Milk')).toBeVisible();
    
    await page.getByLabel('Mark as complete').click();
    await expect(page.getByText('0 items left')).toBeVisible();
    
    await page.getByLabel('Delete Buy Milk').click();
    await expect(page.getByText('Buy Milk')).not.toBeVisible();
  });

  test('should not overflow at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    const body = page.locator('body');
    const scrollWidth = await body.evaluate(el => el.scrollWidth);
    const clientWidth = await body.evaluate(el => el.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('should persist data on reload', async ({ page }) => {
    const input = page.getByPlaceholder('What needs to be done?');
    await input.fill('Persist Me');
    await input.press('Enter');
    
    await page.reload();
    await expect(page.getByText('Persist Me')).toBeVisible();
  });
});