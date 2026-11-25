import { beforeEach, describe, expect, it } from 'vitest';
import { loadTodos, saveTodos } from './storage';
import type { Todo } from './types';

describe('TodoMVC+ local storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and loads todos cleanly', () => {
    const sample: Todo[] = [
      { id: '1', text: 'Verify 320px reflow', completed: false, priority: 'high', tags: ['a11y'], subtasks: [], createdAt: 1 },
    ];
    saveTodos(sample);
    expect(loadTodos()).toEqual(sample);
  });

  it('returns empty array on malformed storage JSON', () => {
    localStorage.setItem('todomvc_plus_react19_todos', '{broken');
    expect(loadTodos()).toEqual([]);
  });
});
