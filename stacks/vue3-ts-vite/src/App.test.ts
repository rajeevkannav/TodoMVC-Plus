import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { nextTick } from 'vue';
import App from './App.vue';
import { MIRROR_KEY, THEME_KEY } from './storage';

async function addTodo(title: string) {
  const input = screen.getByRole('textbox', { name: 'New todo' });
  await fireEvent.update(input, title);
  await fireEvent.click(screen.getByRole('button', { name: 'Add' }));
}

function titles(): string[] {
  const list = screen.queryByRole('list');
  if (!list) return [];
  return within(list)
    .queryAllByRole('listitem')
    .map((li) => li.querySelector('.todo-title, .todo-edit'))
    .map((el) => (el instanceof HTMLInputElement ? el.value : (el?.textContent ?? '')));
}

async function flush() {
  await nextTick();
  await nextTick();
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

afterEach(() => {
  cleanup();
});

describe('App', () => {
  it('renders the contract skeleton', () => {
    render(App);
    expect(screen.getByRole('heading', { level: 1, name: 'TodoMVC+' })).toBeTruthy();
    expect(screen.getByText('vue3-ts-vite')).toBeTruthy();
    const toolbar = screen.getByRole('toolbar', { name: 'App actions' });
    for (const name of ['Undo', 'Redo', 'Export', 'Import', 'Dark theme']) {
      expect(within(toolbar).getByRole('button', { name })).toBeTruthy();
    }
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add' }).getAttribute('type')).toBe('submit');
    // Main section and footer only render once there are todos.
    expect(screen.queryByRole('region', { name: 'Todos' })).toBeNull();
    expect(screen.queryByRole('contentinfo')).toBeNull();
  });

  it('adds trimmed todos, ignores blank input and announces', async () => {
    render(App);
    await addTodo('  Buy milk  ');
    await addTodo('   ');
    expect(titles()).toEqual(['Buy milk']);
    expect(screen.getByRole('status').textContent).toContain('Added "Buy milk"');
    expect((screen.getByRole('textbox', { name: 'New todo' }) as HTMLInputElement).value).toBe('');
    expect(screen.getByText('item left', { exact: false }).textContent).toBe('1 item left');
    expect(JSON.parse(localStorage.getItem(MIRROR_KEY) ?? '[]')).toHaveLength(1);
  });

  it('restores todos from the localStorage mirror on load', () => {
    localStorage.setItem(MIRROR_KEY, JSON.stringify([{ id: 'x', title: 'Saved', completed: true }]));
    render(App);
    expect(titles()).toEqual(['Saved']);
    expect((screen.getByRole('checkbox', { name: 'Toggle Saved' }) as HTMLInputElement).checked).toBe(true);
  });

  it('toggles a todo and toggles all', async () => {
    render(App);
    await addTodo('A');
    await addTodo('B');
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Toggle A' }));
    expect(screen.getByText('item left', { exact: false }).textContent).toBe('1 item left');
    expect(screen.getByRole('checkbox', { name: 'Toggle A' }).closest('li')?.classList).toContain('completed');
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Mark all as complete' }));
    expect(screen.getByText('items left', { exact: false }).textContent).toBe('0 items left');
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Mark all as complete' }));
    expect(screen.getByText('items left', { exact: false }).textContent).toBe('2 items left');
  });

  it('edits inline: Enter saves, Escape cancels, empty deletes', async () => {
    render(App);
    await addTodo('A');
    await addTodo('B');

    await fireEvent.dblClick(screen.getByText('A'));
    await flush();
    let edit = screen.getByRole('textbox', { name: 'Edit A' });
    expect(edit.closest('li')?.classList).toContain('editing');
    expect(document.activeElement).toBe(edit);
    await fireEvent.update(edit, '  Alpha ');
    await fireEvent.keyDown(edit, { key: 'Enter' });
    await flush();
    expect(titles()).toEqual(['Alpha', 'B']);
    expect(document.activeElement).toBe(screen.getByText('Alpha'));

    await fireEvent.keyDown(screen.getByText('Alpha'), { key: 'Enter' });
    edit = screen.getByRole('textbox', { name: 'Edit Alpha' });
    await fireEvent.update(edit, 'Ignored');
    await fireEvent.keyDown(edit, { key: 'Escape' });
    await flush();
    expect(titles()).toEqual(['Alpha', 'B']);

    await fireEvent.dblClick(screen.getByText('B'));
    edit = screen.getByRole('textbox', { name: 'Edit B' });
    await fireEvent.update(edit, '   ');
    await fireEvent.blur(edit);
    expect(titles()).toEqual(['Alpha']);
  });

  it('deletes a todo and moves focus to the neighbour', async () => {
    render(App);
    await addTodo('A');
    await addTodo('B');
    await fireEvent.click(screen.getByRole('button', { name: 'Delete A' }));
    await flush();
    expect(titles()).toEqual(['B']);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Delete B' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Delete B' }));
    await flush();
    expect(titles()).toEqual([]);
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'New todo' }));
  });

  it('filters with aria-pressed and clears completed', async () => {
    render(App);
    await addTodo('A');
    await addTodo('B');
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Toggle B' }));
    const nav = screen.getByRole('navigation', { name: 'Filter todos' });

    await fireEvent.click(within(nav).getByRole('button', { name: 'Active' }));
    expect(titles()).toEqual(['A']);
    expect(within(nav).getByRole('button', { name: 'Active' }).getAttribute('aria-pressed')).toBe('true');
    expect(within(nav).getByRole('button', { name: 'All' }).getAttribute('aria-pressed')).toBe('false');

    await fireEvent.click(within(nav).getByRole('button', { name: 'Completed' }));
    expect(titles()).toEqual(['B']);

    await fireEvent.click(within(nav).getByRole('button', { name: 'All' }));
    expect(titles()).toEqual(['A', 'B']);

    await fireEvent.click(screen.getByRole('button', { name: 'Clear completed' }));
    expect(titles()).toEqual(['A']);
    expect(screen.getByRole('status').textContent).toContain('Cleared 1 completed todo');
  });

  it('undoes and redoes via buttons and keyboard shortcuts', async () => {
    render(App);
    const undo = screen.getByRole('button', { name: 'Undo' }) as HTMLButtonElement;
    const redo = screen.getByRole('button', { name: 'Redo' }) as HTMLButtonElement;
    expect(undo.disabled).toBe(true);
    await addTodo('A');
    await addTodo('B');

    await fireEvent.click(undo);
    expect(titles()).toEqual(['A']);
    expect(screen.getByRole('status').textContent).toContain('Undid');
    await fireEvent.click(redo);
    expect(titles()).toEqual(['A', 'B']);

    await fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true });
    expect(titles()).toEqual(['A']);
    await fireEvent.keyDown(document.body, { key: 'Z', ctrlKey: true, shiftKey: true });
    expect(titles()).toEqual(['A', 'B']);
    expect(redo.disabled).toBe(true);
  });

  it('imports valid JSON and rejects malicious JSON', async () => {
    render(App);
    const fileInput = screen.getByLabelText('Import todos from JSON file') as HTMLInputElement;

    const good = new File([JSON.stringify({ todos: [{ id: '1', title: 'Imported', completed: true }] })], 'good.json', {
      type: 'application/json',
    });
    Object.defineProperty(fileInput, 'files', { value: [good], configurable: true });
    await fireEvent.change(fileInput);
    expect(await screen.findByText('Imported')).toBeTruthy();

    const bad = new File(['{"__proto__":{"polluted":true},"todos":[{"title":42}]}'], 'bad.json', {
      type: 'application/json',
    });
    Object.defineProperty(fileInput, 'files', { value: [bad], configurable: true });
    await fireEvent.change(fileInput);
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Import failed'));
    expect(titles()).toEqual(['Imported']);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('toggles and remembers the dark theme', async () => {
    render(App);
    const toggle = screen.getByRole('button', { name: 'Dark theme' });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
    await fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
    await fireEvent.click(toggle);
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
  });
});
