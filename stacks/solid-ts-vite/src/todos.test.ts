import { describe, it, expect } from 'vitest';
import {
  activeCount,
  filterTodos,
  initialState,
  parseImport,
  serializeExport,
  todoReducer,
  type TodoState,
} from './todos';

function withTodos(...titles: string[]): TodoState {
  return titles.reduce(
    (state, title, i) => todoReducer(state, { type: 'add', title, id: `id-${i}` }),
    initialState(),
  );
}

describe('todoReducer', () => {
  it('adds trimmed titles and ignores empty ones', () => {
    let state = todoReducer(initialState(), { type: 'add', title: '  Buy milk  ', id: 'a' });
    expect(state.todos).toEqual([{ id: 'a', title: 'Buy milk', completed: false }]);
    const same = todoReducer(state, { type: 'add', title: '   ' });
    expect(same).toBe(state);
    state = todoReducer(state, { type: 'add', title: 'Walk dog' });
    expect(state.todos).toHaveLength(2);
  });

  it('toggles one todo and toggles all', () => {
    let state = withTodos('A', 'B');
    state = todoReducer(state, { type: 'toggle', id: 'id-0' });
    expect(state.todos.map((t) => t.completed)).toEqual([true, false]);
    state = todoReducer(state, { type: 'toggleAll', completed: true });
    expect(state.todos.every((t) => t.completed)).toBe(true);
    state = todoReducer(state, { type: 'toggleAll', completed: false });
    expect(state.todos.every((t) => !t.completed)).toBe(true);
  });

  it('edits, deletes on empty edit, and deletes', () => {
    let state = withTodos('A', 'B', 'C');
    state = todoReducer(state, { type: 'edit', id: 'id-0', title: '  Alpha ' });
    expect(state.todos[0].title).toBe('Alpha');
    state = todoReducer(state, { type: 'edit', id: 'id-1', title: '   ' });
    expect(state.todos.map((t) => t.id)).toEqual(['id-0', 'id-2']);
    state = todoReducer(state, { type: 'delete', id: 'id-2' });
    expect(state.todos.map((t) => t.title)).toEqual(['Alpha']);
  });

  it('filters todos, counts active items and clears completed', () => {
    let state = withTodos('A', 'B', 'C');
    state = todoReducer(state, { type: 'toggle', id: 'id-1' });
    expect(filterTodos(state.todos, 'all')).toHaveLength(3);
    expect(filterTodos(state.todos, 'active').map((t) => t.title)).toEqual(['A', 'C']);
    expect(filterTodos(state.todos, 'completed').map((t) => t.title)).toEqual(['B']);
    expect(activeCount(state.todos)).toBe(2);
    state = todoReducer(state, { type: 'clearCompleted' });
    expect(state.todos.map((t) => t.title)).toEqual(['A', 'C']);
  });

  it('undoes and redoes changes, and a new change clears redo', () => {
    let state = withTodos('A');
    state = todoReducer(state, { type: 'toggle', id: 'id-0' });
    state = todoReducer(state, { type: 'undo' });
    expect(state.todos[0].completed).toBe(false);
    state = todoReducer(state, { type: 'undo' });
    expect(state.todos).toEqual([]);
    state = todoReducer(state, { type: 'redo' });
    expect(state.todos.map((t) => t.title)).toEqual(['A']);
    state = todoReducer(state, { type: 'redo' });
    expect(state.todos[0].completed).toBe(true);
    state = todoReducer(state, { type: 'undo' });
    state = todoReducer(state, { type: 'add', title: 'B' });
    expect(state.future).toEqual([]);
  });

  it('sync replaces todos without touching history', () => {
    const state = withTodos('A');
    const synced = todoReducer(state, { type: 'sync', todos: [] });
    expect(synced.todos).toEqual([]);
    expect(synced.past).toBe(state.past);
  });
});

describe('parseImport', () => {
  it('round-trips an export', () => {
    const todos = [{ id: 'x', title: 'Hello', completed: true }];
    const result = parseImport(serializeExport(todos));
    expect(result).toEqual({ ok: true, todos });
  });

  it('accepts a bare array and the legacy { id: number, text } shape', () => {
    const result = parseImport('[{"title":" Bare ","completed":false},{"id":17,"text":"Legacy","completed":true}]');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.todos[0].title).toBe('Bare');
      expect(result.todos[1]).toEqual({ id: '17', title: 'Legacy', completed: true });
    }
  });

  it('rejects malformed JSON and invalid shapes', () => {
    expect(parseImport('{not json').ok).toBe(false);
    expect(parseImport('42').ok).toBe(false);
    expect(parseImport('{"todos":"nope"}').ok).toBe(false);
    expect(parseImport('[{"title":123}]').ok).toBe(false);
    expect(parseImport('[{"title":"ok","completed":"yes"}]').ok).toBe(false);
    expect(parseImport('[{"title":"   "}]').ok).toBe(false);
  });

  it('strips prototype-polluting keys', () => {
    const payload =
      '{"__proto__":{"polluted":true},"todos":[{"id":"a","title":"T","completed":false,' +
      '"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}]}';
    const result = parseImport(payload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.todos).toEqual([{ id: 'a', title: 'T', completed: false }]);
      expect(Object.keys(result.todos[0]).sort()).toEqual(['completed', 'id', 'title']);
    }
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('replaces a __proto__ id and de-duplicates ids', () => {
    const result = parseImport('[{"id":"prototype","title":"A"},{"id":"d","title":"B"},{"id":"d","title":"C"}]');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const ids = result.todos.map((t) => t.id);
      expect(ids).not.toContain('prototype');
      expect(new Set(ids).size).toBe(3);
    }
  });
});
