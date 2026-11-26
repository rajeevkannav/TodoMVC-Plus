import { test, expect, Page } from '@playwright/test';

test('has title', async ({ page }: { page: Page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/TodoMVC+/);
});

test('can add a todo', async ({ page }: { page: Page }) => {
  await page.goto('/');
  const input = page.getByLabel('New todo');
  await input.fill('Learn Playwright');
  await input.press('Enter');
  await expect(page.getByText('Learn Playwright')).toBeVisible();
});