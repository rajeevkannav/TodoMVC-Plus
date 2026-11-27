import { describe, it, expect } from 'vitest';
import { TodoStore } from './todo.store';

describe('TodoStore', () => {
  it('should add todo', () => {
    const store = new TodoStore();
    store.add('Test');
    expect(store.getTodos().length).toBe(1);
  });
});