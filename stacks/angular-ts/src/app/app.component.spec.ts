import { beforeEach, describe, it, expect } from 'vitest';
import { TodoStore, type Todo } from './todo.store';
import { MIRROR_KEY, loadMirror } from './storage';

describe('TodoStore', () => {
  beforeEach(() => localStorage.clear());

  it('should add todo', () => {
    const store = new TodoStore();
    store.add('Test');
    expect(store.getTodos().length).toBe(1);
    expect(store.getTodos()[0].title).toBe('Test');
  });

  it('ignores blank titles without persisting or broadcasting', () => {
    const persisted: Todo[][] = [];
    const store = new TodoStore({ initial: [], persist: (t) => persisted.push(t) });
    expect(store.add('   ')).toBe(false);
    expect(store.getTodos()).toEqual([]);
    expect(persisted).toEqual([]);
    expect(store.changed).toBe(false);
  });

  it('persists to the localStorage mirror and reloads from it', () => {
    const store = new TodoStore();
    store.add('Persist me');
    store.dispatch({ type: 'toggle', id: store.getTodos()[0].id });
    expect(JSON.parse(localStorage.getItem(MIRROR_KEY) ?? '[]')).toHaveLength(1);
    const reloaded = new TodoStore();
    expect(reloaded.getTodos()).toEqual([{ id: store.getTodos()[0].id, title: 'Persist me', completed: true }]);
  });

  it('migrates the legacy `todos` localStorage key', () => {
    localStorage.setItem('todos', JSON.stringify([{ id: 1, text: 'Old', completed: false }]));
    expect(loadMirror()).toEqual([{ id: '1', title: 'Old', completed: false }]);
  });

  it('undoes and redoes, notifying subscribers and broadcasting each change', () => {
    const broadcasts: Todo[][] = [];
    const store = new TodoStore({ initial: [], persist: () => {}, broadcast: (t) => broadcasts.push(t) });
    const seen: number[] = [];
    store.subscribe((s) => seen.push(s.todos.length));
    store.add('A');
    store.add('B');
    expect(store.canUndo).toBe(true);
    store.undo();
    expect(store.getTodos().map((t) => t.title)).toEqual(['A']);
    expect(store.canRedo).toBe(true);
    store.redo();
    expect(store.getTodos().map((t) => t.title)).toEqual(['A', 'B']);
    expect(seen).toEqual([1, 2, 1, 2]);
    expect(broadcasts).toHaveLength(4);
  });

  it('sync replaces todos without persisting or adding history', () => {
    const persisted: Todo[][] = [];
    const store = new TodoStore({ initial: [], persist: (t) => persisted.push(t) });
    store.sync([{ id: 'r', title: 'Remote', completed: false }]);
    expect(store.getTodos()).toEqual([{ id: 'r', title: 'Remote', completed: false }]);
    expect(store.canUndo).toBe(false);
    expect(persisted).toEqual([]);
    expect(store.changed).toBe(false);
  });

  it('clears completed and filters via the reducer', () => {
    const store = new TodoStore({ initial: [], persist: () => {} });
    store.add('Keep');
    store.add('Done');
    store.dispatch({ type: 'toggle', id: store.getTodos()[1].id });
    store.dispatch({ type: 'clearCompleted' });
    expect(store.getTodos().map((t) => t.title)).toEqual(['Keep']);
  });
});
