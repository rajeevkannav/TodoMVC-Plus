import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('TodoMVC+ E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have zero a11y violations', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should handle reflow at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    
    const input = page.getByLabelText('New todo text');
    await input.fill('Reflow test');
    await input.press('Enter');

    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    
    // Check for horizontal overflow
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(overflow).toBe(false);
  });

  test('should persist data after reload', async ({ page }) => {
    const input = page.getByLabelText('New todo text');
    await input.fill('Persistent task');
    await input.press('Enter');
    
    await page.reload();
    await expect(page.getByText('Persistent task')).toBeVisible();
  });

  test('should support undo/redo', async ({ page }) => {
    const input = page.getByLabelText('New todo text');
    await input.fill('Undo task');
    await input.press('Enter');
    
    await expect(page.getByText('Undo task')).toBeVisible();
    
    await page.keyboard.press('Control+z');
    await expect(page.getByText('Undo task')).not.toBeVisible();
    
    await page.keyboard.press('Control+Shift+z');
    await expect(page.getByText('Undo task')).toBeVisible();
  });
});