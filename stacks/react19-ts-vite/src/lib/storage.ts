export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

const DB_NAME = 'TodoMVCPlus';
const STORE_NAME = 'todos';
const DB_VERSION = 1;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
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

export const saveTodosDB = async (todos: Todo[]) => {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  await new Promise<void>((resolve, reject) => {
    const clearReq = store.clear();
    clearReq.onsuccess = () => {
      if (todos.length === 0) {
        resolve();
        return;
      }
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
  // Sync to localStorage for fast fallback
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('todomvc_plus_backup', JSON.stringify(todos));
  }
};

export const loadTodosDB = async (): Promise<Todo[]> => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const results = req.result as Todo[];
        if (results.length > 0) resolve(results.sort((a, b) => a.createdAt - b.createdAt));
        else {
          const backup = typeof localStorage !== 'undefined' ? localStorage.getItem('todomvc_plus_backup') : null;
          resolve(backup ? JSON.parse(backup) : []);
        }
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    const backup = typeof localStorage !== 'undefined' ? localStorage.getItem('todomvc_plus_backup') : null;
    return backup ? JSON.parse(backup) : [];
  }
};

export const validateImport = (data: any): Todo[] => {
  if (!Array.isArray(data)) throw new Error('Invalid format');
  return data.filter(item => {
    const hasKeys = item && typeof item.id === 'string' && typeof item.text === 'string' && typeof item.completed === 'boolean';
    const noPollution = !item.hasOwnProperty('__proto__') && !item.hasOwnProperty('constructor');
    return hasKeys && noPollution;
  }).map(item => ({
    id: item.id,
    text: item.text,
    completed: item.completed,
    createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now()
  }));
};