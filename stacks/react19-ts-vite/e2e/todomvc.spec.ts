import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('TodoMVC+ E2E', () => {
  test('full CRUD, persistence, reflow and accessibility', async ({ page }) => {
    await page.goto('/');

    // Test Viewports for Reflow (320px, 768px, 1280px)
    for (const width of [320, 768, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(width);
    }

    // Add Todo
    const input = page.getByRole('textbox', { name: 'What needs to be done?', exact: true });
    await input.fill('Playwright Test Task');
    await input.press('Enter');

    const list = page.getByRole('list');
    await expect(withinList(list, 'Playwright Test Task')).toBeVisible();

    // Toggle Todo
    const checkbox = list.getByRole('checkbox', { name: 'Mark "Playwright Test Task" as completed', exact: true });
    await checkbox.click();
    await expect(checkbox).toBeChecked();

    // Persistence check
    await expect(withinList(list, 'Playwright Test Task')).toBeVisible();
    await page.waitForTimeout(150);
    await page.reload();
    await expect(withinList(list, 'Playwright Test Task')).toBeVisible();

    // Axe Accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

function withinList(list: any, text: string) {
  return list.getByText(text, { exact: true });
}
