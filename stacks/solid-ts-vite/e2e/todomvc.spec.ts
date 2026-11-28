import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const newTodo = (page: Page) => page.getByRole('textbox', { name: 'New todo', exact: true });

async function addTodo(page: Page, title: string) {
  await newTodo(page).fill(title);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByRole('listitem').filter({ hasText: title })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'TodoMVC+', exact: true })).toBeVisible();
  await expect(page.getByText('solid-ts-vite', { exact: true })).toBeVisible();
});

test('CRUD: add, toggle, edit and delete todos', async ({ page }) => {
  // Blank input does not create a todo.
  await newTodo(page).fill('   ');
  await newTodo(page).press('Enter');
  await expect(page.getByRole('listitem')).toHaveCount(0);

  // Add (trimmed) via Enter and via the Add button.
  await newTodo(page).fill('  Buy milk  ');
  await newTodo(page).press('Enter');
  await expect(page.getByRole('listitem')).toHaveCount(1);
  await expect(page.getByRole('listitem').first()).toContainText('Buy milk');
  await expect(newTodo(page)).toHaveValue('');
  await addTodo(page, 'Walk dog');
  await expect(page.getByText('2 items left', { exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Added "Walk dog"');

  // Toggle.
  await page.getByRole('checkbox', { name: 'Toggle Buy milk', exact: true }).check();
  await expect(page.getByRole('checkbox', { name: 'Toggle Buy milk', exact: true })).toBeChecked();
  await expect(page.getByText('1 item left', { exact: true })).toBeVisible();

  // Inline edit via double-click; Enter saves and focus returns to the title.
  await page.getByText('Walk dog', { exact: true }).dblclick();
  const edit = page.getByRole('textbox', { name: 'Edit Walk dog', exact: true });
  await expect(edit).toBeFocused();
  await edit.fill('Walk the dog');
  await edit.press('Enter');
  await expect(page.getByText('Walk the dog', { exact: true })).toBeVisible();
  await expect(page.getByText('Walk the dog', { exact: true })).toBeFocused();

  // Enter on the focused title starts editing; Escape cancels.
  await page.getByText('Walk the dog', { exact: true }).press('Enter');
  await page.getByRole('textbox', { name: 'Edit Walk the dog', exact: true }).fill('Something else');
  await page.getByRole('textbox', { name: 'Edit Walk the dog', exact: true }).press('Escape');
  await expect(page.getByText('Walk the dog', { exact: true })).toBeVisible();
  await expect(page.getByText('Something else', { exact: true })).toHaveCount(0);

  // Delete; focus moves somewhere sensible.
  await page.getByRole('button', { name: 'Delete Walk the dog', exact: true }).click();
  await expect(page.getByRole('listitem')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Delete Buy milk', exact: true })).toBeFocused();

  // Clear completed removes the remaining (completed) todo.
  await page.getByRole('button', { name: 'Clear completed', exact: true }).click();
  await expect(page.getByRole('listitem')).toHaveCount(0);
  await expect(newTodo(page)).toBeFocused();
});

test('filters show active and completed todos with aria-pressed', async ({ page }) => {
  await addTodo(page, 'Active task');
  await addTodo(page, 'Done task');
  await page.getByRole('checkbox', { name: 'Toggle Done task', exact: true }).check();

  const filters = page.getByRole('navigation', { name: 'Filter todos', exact: true });
  await filters.getByRole('button', { name: 'Active', exact: true }).click();
  await expect(filters.getByRole('button', { name: 'Active', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('listitem')).toHaveCount(1);
  await expect(page.getByRole('listitem').first()).toContainText('Active task');

  await filters.getByRole('button', { name: 'Completed', exact: true }).click();
  await expect(page.getByRole('listitem')).toHaveCount(1);
  await expect(page.getByRole('listitem').first()).toContainText('Done task');

  await filters.getByRole('button', { name: 'All', exact: true }).click();
  await expect(filters.getByRole('button', { name: 'All', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('listitem')).toHaveCount(2);

  // Toggle all.
  await page.getByRole('checkbox', { name: 'Mark all as complete', exact: true }).check();
  await expect(page.getByText('0 items left', { exact: true })).toBeVisible();
});

test('todos and theme persist across reload', async ({ page }) => {
  await addTodo(page, 'Persistent task');
  await page.getByRole('checkbox', { name: 'Toggle Persistent task', exact: true }).check();
  await page.getByRole('button', { name: 'Dark theme', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('listitem').filter({ hasText: 'Persistent task' })).toBeVisible();

  await page.reload();

  await expect(page.getByRole('listitem').filter({ hasText: 'Persistent task' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Toggle Persistent task', exact: true })).toBeChecked();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: 'Dark theme', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('syncs changes to another tab via BroadcastChannel', async ({ page, context }) => {
  const other = await context.newPage();
  await other.goto('/');
  await expect(other.getByRole('heading', { name: 'TodoMVC+', exact: true })).toBeVisible();

  await addTodo(page, 'Shared task');
  await expect(other.getByRole('listitem').filter({ hasText: 'Shared task' })).toBeVisible();
  await other.close();
});

test('undo and redo via buttons and keyboard shortcuts', async ({ page }) => {
  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  const redo = page.getByRole('button', { name: 'Redo', exact: true });
  await expect(undo).toBeDisabled();

  await addTodo(page, 'Undoable');
  await undo.click();
  await expect(page.getByRole('listitem')).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('Undid');

  await redo.click();
  await expect(page.getByRole('listitem')).toHaveCount(1);

  // Keyboard shortcuts (focus outside a text field).
  await page.getByRole('heading', { name: 'TodoMVC+', exact: true }).click();
  await page.keyboard.press('Control+z');
  await expect(page.getByRole('listitem')).toHaveCount(0);
  await page.keyboard.press('Control+Shift+z');
  await expect(page.getByRole('listitem')).toHaveCount(1);
  await expect(page.getByRole('listitem').first()).toContainText('Undoable');
});

test('has zero axe violations in light and dark themes', async ({ page }) => {
  await addTodo(page, 'Accessible task');
  await addTodo(page, 'Completed task');
  await page.getByRole('checkbox', { name: 'Toggle Completed task', exact: true }).check();

  const light = await new AxeBuilder({ page }).analyze();
  expect(light.violations).toEqual([]);

  await page.getByRole('button', { name: 'Dark theme', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const dark = await new AxeBuilder({ page }).analyze();
  expect(dark.violations).toEqual([]);
});

for (const width of [320, 768, 1280]) {
  test(`reflows without horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await addTodo(page, 'A very long todo title that should wrap instead of overflowing the viewport horizontally');
    await addTodo(page, 'Supercalifragilisticexpialidocious_unbroken_token_that_must_wrap_anywhere_too');

    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);

    for (const name of ['Undo', 'Redo', 'Export', 'Import', 'Dark theme', 'Add', 'Clear completed']) {
      await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
    }

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}
