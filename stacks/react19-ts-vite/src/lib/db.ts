import { get, set } from 'idb-keyval';
import { Todo, TodoSchema } from '../types';
import { z } from 'zod';

const STORAGE_KEY = 'todomvc_plus_state';

export async function saveTodos(todos: Todo[]) {
  try {
    await set(STORAGE_KEY, todos);
  } catch (e) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }
}

export async function loadTodos(): Promise<Todo[]> {
  let data;
  try {
    data = await get(STORAGE_KEY);
  } catch (e) {
    data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  }
  
  const result = z.array(TodoSchema).safeParse(data);
  return result.success ? result.data : [];
}