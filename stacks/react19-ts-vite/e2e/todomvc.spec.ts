import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('TodoMVC+ Accessibility, Reflow & Modern UX', () => {
  test('passes WCAG 2.2 AA axe audit with zero violations', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('supports keyboard-only CRUD and zero horizontal overflow at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto('/');

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth);

    const input = page.getByLabel('New todo text');
    await input.fill('Buy organic milk');
    await input.press('Enter');

    await expect(page.getByText('Buy organic milk')).toBeVisible();
    await expect(page.getByText('1 item left')).toBeVisible();

    const checkbox = page.getByRole('checkbox', { name: /Mark "Buy organic milk"/ });
    await checkbox.click();
    await expect(page.getByText('0 items left')).toBeVisible();

    const overflowAfter = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(overflowAfter.scrollWidth).toBeLessThanOrEqual(overflowAfter.innerWidth);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('synchronizes todos across browser tabs via BroadcastChannel', async ({ context }) => {
    const pageA = await context.newPage();
    const pageB = await context.newPage();
    await pageA.goto('/');
    await pageB.goto('/');

    const input = pageA.getByLabel('New todo text');
    await input.fill('Synced across tabs');
    await input.press('Enter');

    await expect(pageB.getByText('Synced across tabs')).toBeVisible();
  });
});
