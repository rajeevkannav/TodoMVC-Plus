import { get, set } from 'idb-keyval';

const DB_KEY = 'todomvc_plus_state_v1';

export async function saveToDb<T>(data: T): Promise<void> {
  try {
    await set(DB_KEY, data);
    // Sync mirror to localStorage for immediate reload consistency
    localStorage.setItem(DB_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('IDB Save Error:', err);
  }
}

export async function loadFromDb<T>(): Promise<T | null> {
  try {
    // Try IDB first
    const data = await get(DB_KEY);
    if (data) return data as T;
    
    // Fallback to localStorage
    const local = localStorage.getItem(DB_KEY);
    if (local) return JSON.parse(local) as T;
  } catch (err) {
    console.error('IDB Load Error:', err);
  }
  return null;
}