import { get, set } from 'idb-keyval';
import { Todo } from '../types';

const STORAGE_KEY = 'todomvc_plus_state';

export async function saveTodos(todos: Todo[]) {
  try {
    await set(STORAGE_KEY, todos);
  } catch (e) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }
}

export async function loadTodos(): Promise<Todo[]> {
  try {
    const data = await get(STORAGE_KEY);
    return data || [];
  } catch (e) {
    const local = localStorage.getItem(STORAGE_KEY);
    return local ? JSON.parse(local) : [];
  }
}