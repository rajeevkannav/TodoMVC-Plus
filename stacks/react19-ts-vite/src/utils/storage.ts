import { Todo } from '../types';

const STORAGE_KEY = 'todomvc_plus_state_v1';

export function loadTodos(): Todo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((t: any) => ({
          id: String(t.id || Math.random()),
          text: String(t.text || ''),
          completed: Boolean(t.completed),
          createdAt: Number(t.createdAt || Date.now()),
        }));
      }
    }
  } catch (e) {
    console.error('Failed to load todos from localStorage', e);
  }
  return [];
}

export function saveTodos(todos: Todo[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch (e) {
    console.error('Failed to save todos to localStorage', e);
  }
}
