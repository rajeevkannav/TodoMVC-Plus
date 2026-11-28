import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library';
import App from './App';
import { MIRROR_KEY, THEME_KEY } from './storage';

function addTodo(title: string) {
  const input = screen.getByRole('textbox', { name: 'New todo' });
  fireEvent.input(input, { target: { value: title } });
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
    render(() => <App />);
    expect(screen.getByRole('heading', { level: 1, name: 'TodoMVC+' })).toBeInTheDocument();
    expect(screen.getByText('solid-ts-vite')).toBeInTheDocument();
    const toolbar = screen.getByRole('toolbar', { name: 'App actions' });
    for (const name of ['Undo', 'Redo', 'Export', 'Import', 'Dark theme']) {
      expect(within(toolbar).getByRole('button', { name })).toBeInTheDocument();
    }
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    // Main section and footer only render once there are todos.
    expect(screen.queryByRole('region', { name: 'Todos' })).toBeNull();
    expect(screen.queryByRole('contentinfo')).toBeNull();
  });

  it('adds trimmed todos, ignores blank input and announces', () => {
    render(() => <App />);
    addTodo('  Buy milk  ');
    addTodo('   ');
    expect(titles()).toEqual(['Buy milk']);
    expect(screen.getByRole('status').textContent).toContain('Added "Buy milk"');
    expect((screen.getByRole('textbox', { name: 'New todo' }) as HTMLInputElement).value).toBe('');
    expect(screen.getByText('item left', { exact: false }).textContent).toBe('1 item left');
    expect(JSON.parse(localStorage.getItem(MIRROR_KEY) ?? '[]')).toHaveLength(1);
  });

  it('loads todos saved by the previous version of the app', () => {
    localStorage.setItem('todos', JSON.stringify([{ id: 1, text: 'Legacy', completed: true }]));
    render(() => <App />);
    expect(titles()).toEqual(['Legacy']);
    expect(screen.getByRole('checkbox', { name: 'Toggle Legacy' })).toBeChecked();
  });

  it('toggles a todo and toggles all', () => {
    render(() => <App />);
    addTodo('A');
    addTodo('B');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Toggle A' }));
    expect(screen.getByText('item left', { exact: false }).textContent).toBe('1 item left');
    expect(screen.getByRole('checkbox', { name: 'Toggle A' }).closest('li')).toHaveClass('completed');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Mark all as complete' }));
    expect(screen.getByText('items left', { exact: false }).textContent).toBe('0 items left');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Mark all as complete' }));
    expect(screen.getByText('items left', { exact: false }).textContent).toBe('2 items left');
  });

  it('edits inline: Enter saves, Escape cancels, empty deletes', () => {
    render(() => <App />);
    addTodo('A');
    addTodo('B');

    fireEvent.dblClick(screen.getByText('A'));
    let edit = screen.getByRole('textbox', { name: 'Edit A' });
    expect(edit.closest('li')).toHaveClass('editing');
    expect(document.activeElement).toBe(edit);
    fireEvent.input(edit, { target: { value: '  Alpha ' } });
    fireEvent.keyDown(edit, { key: 'Enter' });
    expect(titles()).toEqual(['Alpha', 'B']);
    expect(document.activeElement).toBe(screen.getByText('Alpha'));

    fireEvent.keyDown(screen.getByText('Alpha'), { key: 'Enter' });
    edit = screen.getByRole('textbox', { name: 'Edit Alpha' });
    fireEvent.input(edit, { target: { value: 'Ignored' } });
    fireEvent.keyDown(edit, { key: 'Escape' });
    expect(titles()).toEqual(['Alpha', 'B']);
    expect(document.activeElement).toBe(screen.getByText('Alpha'));

    fireEvent.dblClick(screen.getByText('B'));
    edit = screen.getByRole('textbox', { name: 'Edit B' });
    fireEvent.input(edit, { target: { value: 'Bravo' } });
    fireEvent.blur(edit);
    expect(titles()).toEqual(['Alpha', 'Bravo']);

    fireEvent.dblClick(screen.getByText('Bravo'));
    edit = screen.getByRole('textbox', { name: 'Edit Bravo' });
    fireEvent.input(edit, { target: { value: '   ' } });
    fireEvent.blur(edit);
    expect(titles()).toEqual(['Alpha']);
  });

  it('deletes a todo and moves focus to the neighbour', () => {
    render(() => <App />);
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
    render(() => <App />);
    addTodo('A');
    addTodo('B');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Toggle B' }));
    const nav = screen.getByRole('navigation', { name: 'Filter todos' });

    fireEvent.click(within(nav).getByRole('button', { name: 'Active' }));
    expect(titles()).toEqual(['A']);
    expect(within(nav).getByRole('button', { name: 'Active' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(nav).getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(within(nav).getByRole('button', { name: 'Completed' }));
    expect(titles()).toEqual(['B']);

    fireEvent.click(within(nav).getByRole('button', { name: 'All' }));
    expect(titles()).toEqual(['A', 'B']);

    fireEvent.click(screen.getByRole('button', { name: 'Clear completed' }));
    expect(titles()).toEqual(['A']);
    expect(screen.getByRole('status').textContent).toContain('Cleared 1 completed todo');
  });

  it('undoes and redoes via buttons and keyboard shortcuts', () => {
    render(() => <App />);
    const undo = screen.getByRole('button', { name: 'Undo' });
    const redo = screen.getByRole('button', { name: 'Redo' });
    expect(undo).toBeDisabled();
    addTodo('A');
    addTodo('B');

    fireEvent.click(undo);
    expect(titles()).toEqual(['A']);
    expect(screen.getByRole('status').textContent).toContain('Undid');
    fireEvent.click(redo);
    expect(titles()).toEqual(['A', 'B']);

    fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true });
    expect(titles()).toEqual(['A']);
    fireEvent.keyDown(document.body, { key: 'Z', ctrlKey: true, shiftKey: true });
    expect(titles()).toEqual(['A', 'B']);
    expect(redo).toBeDisabled();
  });

  it('imports valid JSON and rejects malicious JSON', async () => {
    render(() => <App />);
    const fileInput = screen.getByLabelText('Import todos from JSON file') as HTMLInputElement;

    const good = new File([JSON.stringify({ todos: [{ id: '1', title: 'Imported', completed: true }] })], 'good.json', {
      type: 'application/json',
    });
    fireEvent.change(fileInput, { target: { files: [good] } });
    expect(await screen.findByText('Imported')).toBeInTheDocument();

    const bad = new File(['{"__proto__":{"polluted":true},"todos":[{"title":42}]}'], 'bad.json', {
      type: 'application/json',
    });
    fireEvent.change(fileInput, { target: { files: [bad] } });
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Import failed'));
    expect(titles()).toEqual(['Imported']);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('toggles and remembers the dark theme', () => {
    render(() => <App />);
    const toggle = screen.getByRole('button', { name: 'Dark theme' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
    fireEvent.click(toggle);
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
  });

  it('restores the remembered dark theme on start', () => {
    localStorage.setItem(THEME_KEY, 'dark');
    render(() => <App />);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(screen.getByRole('button', { name: 'Dark theme' })).toHaveAttribute('aria-pressed', 'true');
  });
});
