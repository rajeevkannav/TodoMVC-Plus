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

export const saveTodos = async (todos: any[]) => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await new Promise<void>((resolve, reject) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        todos.forEach(todo => store.add(todo));
        resolve();
      };
      clearReq.onerror = () => reject(clearReq.error);
    });
  } catch (e) {
    localStorage.setItem('todos-fallback', JSON.stringify(todos));
  }
};

export const loadTodos = async (): Promise<any[]> => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve(JSON.parse(localStorage.getItem('todos-fallback') || '[]'));
    });
  } catch (e) {
    return JSON.parse(localStorage.getItem('todos-fallback') || '[]');
  }
};