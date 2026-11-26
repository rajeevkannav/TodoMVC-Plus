import { Todo } from '../types';

const DB_NAME = 'TodoMVCPlus';
const STORE_NAME = 'todos';
const VERSION = 1;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveTodos = async (todos: Todo[]) => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await new Promise<void>((resolve, reject) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        if (todos.length === 0) return resolve();
        let count = 0;
        todos.forEach(todo => {
          const req = store.add(todo);
          req.onsuccess = () => {
            count++;
            if (count === todos.length) resolve();
          };
          req.onerror = () => reject(req.error);
        });
      };
      clearReq.onerror = () => reject(clearReq.error);
    });
  } catch (e) {
    localStorage.setItem('todomvc-fallback', JSON.stringify(todos));
  }
};

export const loadTodos = async (): Promise<Todo[]> => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    const fallback = localStorage.getItem('todomvc-fallback');
    return fallback ? JSON.parse(fallback) : [];
  }
};