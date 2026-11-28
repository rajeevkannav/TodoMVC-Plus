import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import App from './App.svelte';
import { MIRROR_KEY, THEME_KEY } from './storage';

let app: ReturnType<typeof mount> | null = null;
let target: HTMLElement;

function render() {
  app = mount(App, { target });
  flushSync();
}

function q<T extends Element = HTMLElement>(selector: string): T | null {
  return target.querySelector<T>(selector);
}

function button(name: string): HTMLButtonElement {
  const match = Array.from(target.querySelectorAll('button')).find(
    (b) => (b.getAttribute('aria-label') ?? b.textContent ?? '').trim() === name,
  );
  if (!match) throw new Error(`No button named "${name}"`);
  return match;
}

function checkbox(name: string): HTMLInputElement {
  if (name === 'Mark all as complete') return q<HTMLInputElement>('#toggle-all')!;
  const el = q<HTMLInputElement>(`input[type="checkbox"][aria-label="${name}"]`);
  if (!el) throw new Error(`No checkbox named "${name}"`);
  return el;
}

function type(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  flushSync();
}

function click(el: HTMLElement) {
  el.click();
  flushSync();
}

function key(el: HTMLElement, k: string, init: KeyboardEventInit = {}) {
  el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init }));
  flushSync();
}

function addTodo(title: string) {
  type(q<HTMLInputElement>('#new-todo')!, title);
  click(button('Add'));
}

function titles(): string[] {
  return Array.from(target.querySelectorAll('li.todo-item')).map((li) => {
    const el = li.querySelector('.todo-title, .todo-edit');
    return el instanceof HTMLInputElement ? el.value : (el?.textContent ?? '');
  });
}

/** Let pending microtasks (tick-based focus moves, file reads) run, then flush. */
const settle = () => new Promise((r) => setTimeout(r, 0)).then(() => flushSync());
const status = () => q('[role="status"]')!.textContent ?? '';
const count = () => q('.todo-count')?.textContent ?? '';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  target = document.createElement('div');
  document.body.append(target);
});

afterEach(() => {
  if (app) unmount(app);
  app = null;
  target.remove();
});

describe('App', () => {
  it('renders the contract skeleton', () => {
    render();
    expect(q('main.todoapp')?.getAttribute('aria-labelledby')).toBe('app-title');
    expect(q('h1.app-title')?.textContent).toBe('TodoMVC+');
    expect(q('.app-stack')?.textContent).toBe('svelte5-ts-vite');
    const toolbar = q('.app-toolbar[role="toolbar"]')!;
    expect(toolbar.getAttribute('aria-label')).toBe('App actions');
    for (const name of ['Undo', 'Redo', 'Export', 'Import', 'Dark theme']) {
      expect(toolbar.contains(button(name))).toBe(true);
    }
    expect(button('Add').getAttribute('type')).toBe('submit');
    expect(q('label[for="new-todo"]')?.textContent).toBe('New todo');
    expect(q('[role="status"]')?.getAttribute('aria-live')).toBe('polite');
    expect(q('.todo-main')).toBeNull();
    expect(q('.app-footer')).toBeNull();
  });

  it('adds trimmed todos, ignores blank input and announces', () => {
    render();
    addTodo('  Buy milk  ');
    addTodo('   ');
    expect(titles()).toEqual(['Buy milk']);
    expect(status()).toContain('Added "Buy milk"');
    expect(q<HTMLInputElement>('#new-todo')!.value).toBe('');
    expect(count()).toBe('1 item left');
    expect(JSON.parse(localStorage.getItem(MIRROR_KEY) ?? '[]')).toHaveLength(1);
  });

  it('restores todos from the localStorage mirror on load', () => {
    localStorage.setItem(MIRROR_KEY, JSON.stringify([{ id: 'x', title: 'Saved', completed: true }]));
    render();
    expect(titles()).toEqual(['Saved']);
    expect(checkbox('Toggle Saved').checked).toBe(true);
  });

  it('migrates the legacy "todos" key written by the previous version', () => {
    localStorage.setItem('todos', JSON.stringify([{ id: 'old', text: 'Legacy', completed: false }]));
    render();
    expect(titles()).toEqual(['Legacy']);
  });

  it('toggles a todo and toggles all', () => {
    render();
    addTodo('A');
    addTodo('B');
    click(checkbox('Toggle A'));
    expect(count()).toBe('1 item left');
    expect(checkbox('Toggle A').closest('li')?.classList.contains('completed')).toBe(true);
    click(checkbox('Mark all as complete'));
    expect(count()).toBe('0 items left');
    click(checkbox('Mark all as complete'));
    expect(count()).toBe('2 items left');
  });

  it('edits inline: Enter saves, Escape cancels, empty deletes', async () => {
    render();
    addTodo('Walk dog');
    addTodo('Other');
    const title = () => q<HTMLElement>('li.todo-item .todo-title')!;

    title().dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    flushSync();
    await settle();
    let edit = q<HTMLInputElement>('.todo-edit')!;
    expect(edit.getAttribute('aria-label')).toBe('Edit Walk dog');
    expect(edit.closest('li')?.classList.contains('editing')).toBe(true);
    expect(document.activeElement).toBe(edit);
    type(edit, 'Walk the dog');
    key(edit, 'Enter');
    await settle();
    expect(titles()).toEqual(['Walk the dog', 'Other']);
    expect(document.activeElement).toBe(title());

    key(title(), 'Enter');
    await settle();
    edit = q<HTMLInputElement>('.todo-edit')!;
    type(edit, 'Changed');
    key(edit, 'Escape');
    expect(titles()).toEqual(['Walk the dog', 'Other']);

    key(title(), 'Enter');
    await settle();
    edit = q<HTMLInputElement>('.todo-edit')!;
    type(edit, '   ');
    key(edit, 'Enter');
    await settle();
    expect(titles()).toEqual(['Other']);
    expect(document.activeElement).toBe(button('Delete Other'));
  });

  it('saves an edit on blur', async () => {
    render();
    addTodo('Blur me');
    q('.todo-title')!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    flushSync();
    await settle();
    const edit = q<HTMLInputElement>('.todo-edit')!;
    type(edit, 'Blurred');
    edit.blur();
    flushSync();
    expect(titles()).toEqual(['Blurred']);
  });

  it('deletes with focus moving to a neighbour, then the input', async () => {
    render();
    addTodo('A');
    addTodo('B');
    click(button('Delete A'));
    await settle();
    expect(titles()).toEqual(['B']);
    expect(status()).toContain('Deleted "A"');
    expect(document.activeElement).toBe(button('Delete B'));
    click(button('Delete B'));
    await settle();
    expect(titles()).toEqual([]);
    expect(document.activeElement).toBe(q('#new-todo'));
  });

  it('filters with aria-pressed and clears completed', async () => {
    render();
    addTodo('Active task');
    addTodo('Done task');
    click(checkbox('Toggle Done task'));
    expect(button('Clear completed').disabled).toBe(false);

    click(button('Active'));
    expect(button('Active').getAttribute('aria-pressed')).toBe('true');
    expect(button('All').getAttribute('aria-pressed')).toBe('false');
    expect(titles()).toEqual(['Active task']);
    click(button('Completed'));
    expect(titles()).toEqual(['Done task']);
    click(button('All'));
    expect(titles()).toEqual(['Active task', 'Done task']);

    click(button('Clear completed'));
    await settle();
    expect(titles()).toEqual(['Active task']);
    expect(status()).toContain('Cleared 1 completed todo');
  });

  it('undoes and redoes via buttons and keyboard shortcuts', () => {
    render();
    expect(button('Undo').disabled).toBe(true);
    addTodo('Undoable');
    click(button('Undo'));
    expect(titles()).toEqual([]);
    expect(status()).toContain('Undid');
    click(button('Redo'));
    expect(titles()).toEqual(['Undoable']);

    key(document.body, 'z', { ctrlKey: true });
    expect(titles()).toEqual([]);
    key(document.body, 'Z', { ctrlKey: true, shiftKey: true });
    expect(titles()).toEqual(['Undoable']);

    // Inside a text field the native undo is left alone.
    key(q<HTMLInputElement>('#new-todo')!, 'z', { ctrlKey: true });
    expect(titles()).toEqual(['Undoable']);
  });

  it('toggles and persists the dark theme (light by default)', () => {
    render();
    const toggle = button('Dark theme');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    click(toggle);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
    click(toggle);
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
  });

  it('imports a valid JSON file and rejects an invalid one', async () => {
    render();
    const fileInput = q<HTMLInputElement>('input[type="file"]')!;
    expect(fileInput.accept).toBe('application/json');

    const choose = async (content: string) => {
      const before = status();
      const file = new File([content], 'todos.json', { type: 'application/json' });
      Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      for (let i = 0; i < 50 && status() === before; i++) await settle();
    };

    await choose('{"todos":[{"id":"i1","title":"Imported","completed":true}]}');
    expect(titles()).toEqual(['Imported']);
    expect(status()).toContain('Imported 1 todo');

    await choose('{"__proto__":{"polluted":true},"todos":"nope"}');
    expect(titles()).toEqual(['Imported']);
    expect(status()).toContain('Import failed');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
