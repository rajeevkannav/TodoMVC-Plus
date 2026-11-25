import { Todo } from './types';

const STORAGE_KEY = 'todomvc_plus_react19_todos';
const CHANNEL_NAME = 'todomvc_plus_sync';

let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && window.BroadcastChannel) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  }
} catch (e) {
  console.warn('BroadcastChannel not supported', e);
}

export function saveTodos(todos: Todo[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'SYNC_TODOS', todos });
    }
  } catch (e) {
    console.error('Failed to save todos to localStorage', e);
  }
}

export function loadTodos(): Todo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (e) {
    console.error('Failed to load todos from localStorage', e);
  }
  return [];
}

export function subscribeToSync(onSync: (todos: Todo[]) => void): () => void {
  if (!broadcastChannel) return () => {};
  const listener = (event: MessageEvent) => {
    if (event.data && event.data.type === 'SYNC_TODOS' && Array.isArray(event.data.todos)) {
      onSync(event.data.todos);
    }
  };
  broadcastChannel.addEventListener('message', listener);
  return () => {
    broadcastChannel?.removeEventListener('message', listener);
  };
}
