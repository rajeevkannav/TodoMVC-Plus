import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from './App';
import { MIRROR_KEY, THEME_KEY } from './storage';

function addTodo(title: string) {
  const input = screen.getByRole('textbox', { name: 'New todo' });
  fireEvent.change(input, { target: { value: title } });
  fireEvent.click(screen.getByRole('button', { name: 'Add' }));
}

function titles(): string[] {
  const list = screen.queryByRole('list');
  if (!list) return [];
  return within(list)
    .queryAllByRole('listitem')
    .map((li) => li.querySelector('.todo-title, .todo-edit'))
    .map((el) => (el instanceof HTMLInputElement ? el.value : (el?.textContent ?? '')));
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
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'TodoMVC+' })).toBeTruthy();
    expect(screen.getByText('react19-ts-vite')).toBeTruthy();
    const toolbar = screen.getByRole('toolbar', { name: 'App actions' });
    for (const name of ['Undo', 'Redo', 'Export', 'Import', 'Dark theme']) {
      expect(within(toolbar).getByRole('button', { name })).toBeTruthy();
    }
    expect(screen.getByRole('status')).toBeTruthy();
    // Main section and footer only render once there are todos.
    expect(screen.queryByRole('region', { name: 'Todos' })).toBeNull();
    expect(screen.queryByRole('contentinfo')).toBeNull();
  });

  it('adds trimmed todos, ignores blank input and announces', () => {
    render(<App />);
    addTodo('  Buy milk  ');
    addTodo('   ');
    expect(titles()).toEqual(['Buy milk']);
    expect(screen.getByRole('status').textContent).toContain('Added "Buy milk"');
    expect((screen.getByRole('textbox', { name: 'New todo' }) as HTMLInputElement).value).toBe('');
    expect(screen.getByText('item left', { exact: false }).textContent).toBe('1 item left');
    expect(JSON.parse(localStorage.getItem(MIRROR_KEY) ?? '[]')).toHaveLength(1);
  });

  it('toggles a todo and toggles all', () => {
    render(<App />);
    addTodo('A');
    addTodo('B');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Toggle A' }));
    expect(screen.getByText('item left', { exact: false }).textContent).toBe('1 item left');
    expect(screen.getByRole('checkbox', { name: 'Toggle A' }).closest('li')?.classList).toContain('completed');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Mark all as complete' }));
    expect(screen.getByText('items left', { exact: false }).textContent).toBe('0 items left');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Mark all as complete' }));
    expect(screen.getByText('items left', { exact: false }).textContent).toBe('2 items left');
  });

  it('edits inline: Enter saves, Escape cancels, empty deletes', () => {
    render(<App />);
    addTodo('A');
    addTodo('B');

    fireEvent.doubleClick(screen.getByText('A'));
    let edit = screen.getByRole('textbox', { name: 'Edit A' });
    expect(document.activeElement).toBe(edit);
    fireEvent.change(edit, { target: { value: '  Alpha ' } });
    fireEvent.keyDown(edit, { key: 'Enter' });
    expect(titles()).toEqual(['Alpha', 'B']);
    expect(document.activeElement).toBe(screen.getByText('Alpha'));

    fireEvent.keyDown(screen.getByText('Alpha'), { key: 'Enter' });
    edit = screen.getByRole('textbox', { name: 'Edit Alpha' });
    fireEvent.change(edit, { target: { value: 'Ignored' } });
    fireEvent.keyDown(edit, { key: 'Escape' });
    expect(titles()).toEqual(['Alpha', 'B']);

    fireEvent.doubleClick(screen.getByText('B'));
    edit = screen.getByRole('textbox', { name: 'Edit B' });
    fireEvent.change(edit, { target: { value: '   ' } });
    fireEvent.blur(edit);
    expect(titles()).toEqual(['Alpha']);
  });

  it('deletes a todo and moves focus to the neighbour', () => {
    render(<App />);
    addTodo('A');
    addTodo('B');
    fireEvent.click(screen.getByRole('button', { name: 'Delete A' }));
    expect(titles()).toEqual(['B']);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Delete B' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete B' }));
    expect(titles()).toEqual([]);
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'New todo' }));
  });

  it('filters with aria-pressed and clears completed', () => {
    render(<App />);
    addTodo('A');
    addTodo('B');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Toggle B' }));
    const nav = screen.getByRole('navigation', { name: 'Filter todos' });

    fireEvent.click(within(nav).getByRole('button', { name: 'Active' }));
    expect(titles()).toEqual(['A']);
    expect(within(nav).getByRole('button', { name: 'Active' }).getAttribute('aria-pressed')).toBe('true');
    expect(within(nav).getByRole('button', { name: 'All' }).getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(within(nav).getByRole('button', { name: 'Completed' }));
    expect(titles()).toEqual(['B']);

    fireEvent.click(within(nav).getByRole('button', { name: 'All' }));
    expect(titles()).toEqual(['A', 'B']);

    fireEvent.click(screen.getByRole('button', { name: 'Clear completed' }));
    expect(titles()).toEqual(['A']);
  });

  it('undoes and redoes via buttons and keyboard shortcuts', () => {
    render(<App />);
    const undo = screen.getByRole('button', { name: 'Undo' }) as HTMLButtonElement;
    const redo = screen.getByRole('button', { name: 'Redo' }) as HTMLButtonElement;
    expect(undo.disabled).toBe(true);
    addTodo('A');
    addTodo('B');

    fireEvent.click(undo);
    expect(titles()).toEqual(['A']);
    fireEvent.click(redo);
    expect(titles()).toEqual(['A', 'B']);

    act(() => {
      fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true });
    });
    expect(titles()).toEqual(['A']);
    act(() => {
      fireEvent.keyDown(document.body, { key: 'Z', ctrlKey: true, shiftKey: true });
    });
    expect(titles()).toEqual(['A', 'B']);
    expect(redo.disabled).toBe(true);
  });

  it('imports valid JSON and rejects malicious JSON', async () => {
    render(<App />);
    const fileInput = screen.getByLabelText('Import todos from JSON file') as HTMLInputElement;

    const good = new File([JSON.stringify({ todos: [{ id: '1', title: 'Imported', completed: true }] })], 'good.json', {
      type: 'application/json',
    });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [good] } });
    });
    expect(await screen.findByText('Imported')).toBeTruthy();

    const bad = new File(['{"__proto__":{"polluted":true},"todos":[{"title":42}]}'], 'bad.json', {
      type: 'application/json',
    });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [bad] } });
    });
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Import failed'));
    expect(titles()).toEqual(['Imported']);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('toggles and remembers the dark theme', () => {
    render(<App />);
    const toggle = screen.getByRole('button', { name: 'Dark theme' });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
    fireEvent.click(toggle);
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
  });
});
