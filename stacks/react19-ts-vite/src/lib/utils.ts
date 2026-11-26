import { Todo } from './db';

export function validateImport(data: any): Todo[] {
  if (!Array.isArray(data)) throw new Error('Invalid data format');
  return data.filter(item => {
    if (typeof item !== 'object' || item === null) return false;
    const hasId = typeof item.id === 'string';
    const hasText = typeof item.text === 'string';
    const hasCompleted = typeof item.completed === 'boolean';
    // Prototype pollution check: ensure no inherited properties are used
    const isSafe = !Object.prototype.hasOwnProperty.call(item, '__proto__') && 
                   !Object.prototype.hasOwnProperty.call(item, 'constructor');
    return hasId && hasText && hasCompleted && isSafe;
  }).map(item => ({
    id: item.id,
    text: item.text,
    completed: item.completed,
    createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now()
  }));
}

export function generateId() {
  return crypto.randomUUID();
}