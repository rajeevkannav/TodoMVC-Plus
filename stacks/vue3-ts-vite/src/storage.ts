import { safeJsonParse, sanitizeTodos, type Todo } from './todos';

const DB_NAME = 'todomvc-plus';
const DB_VERSION = 1;
const STORE = 'state';
const RECORD_KEY = 'todos';
export const MIRROR_KEY = 'todomvc-plus:todos';
const LEGACY_KEY = 'todos';
const CHANNEL_NAME = 'todomvc-plus';
export const THEME_KEY = 'todomvc-plus:theme';

export type Theme = 'light' | 'dark';

function safeLocalStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** Synchronous first paint from the localStorage mirror (or legacy key). */
export function loadMirror(): Todo[] {
  const ls = safeLocalStorage();
  if (!ls) return [];
  for (const key of [MIRROR_KEY, LEGACY_KEY]) {
    try {
      const raw = ls.getItem(key);
      if (raw === null) continue;
      const todos = sanitizeTodos(safeJsonParse(raw));
      if (todos) return todos;
    } catch {
      // ignore corrupt data and fall through
    }
  }
  return [];
}

function writeMirror(todos: Todo[]): void {
  try {
    safeLocalStorage()?.setItem(MIRROR_KEY, JSON.stringify(todos));
  } catch {
    // quota exceeded or storage disabled: IndexedDB remains the primary store
  }
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

export async function loadFromIndexedDb(): Promise<Todo[] | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(RECORD_KEY);
      request.onsuccess = () => resolve(request.result === undefined ? null : sanitizeTodos(request.result));
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function writeIndexedDb(todos: Todo[]): Promise<void> {
  const db = await openDb();
  if (!db) return;
  try {
    db.transaction(STORE, 'readwrite').objectStore(STORE).put(todos, RECORD_KEY);
  } catch {
    // the localStorage mirror still holds the data
  }
}

export function saveTodos(todos: Todo[]): void {
  writeMirror(todos);
  void writeIndexedDb(todos);
}

type SyncMessage = { type: 'todos'; todos: unknown };

export type SyncChannel = { post: (todos: Todo[]) => void; close: () => void };

export function openSyncChannel(onRemote: (todos: Todo[]) => void): SyncChannel {
  if (typeof BroadcastChannel === 'undefined') return { post: () => {}, close: () => {} };
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (event: MessageEvent<SyncMessage>) => {
    const data = event.data;
    if (!data || data.type !== 'todos') return;
    const todos = sanitizeTodos(data.todos);
    if (todos) onRemote(todos);
  };
  return {
    post: (todos) => channel.postMessage({ type: 'todos', todos } satisfies SyncMessage),
    close: () => channel.close(),
  };
}

export function loadTheme(): Theme {
  try {
    return safeLocalStorage()?.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'dark') root.setAttribute('data-theme', 'dark');
  else root.removeAttribute('data-theme');
}

export function saveTheme(theme: Theme): void {
  try {
    safeLocalStorage()?.setItem(THEME_KEY, theme);
  } catch {
    // ignore
  }
}
