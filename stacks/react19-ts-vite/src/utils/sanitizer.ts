import { Todo } from '../types';

export function sanitizeAndValidateImport(jsonString: string): Todo[] | null {
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) return null;

    const validTodos: Todo[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      
      // Check for prototype pollution keys
      if (
        Object.prototype.hasOwnProperty.call(item, '__proto__') || 
        Object.prototype.hasOwnProperty.call(item, 'constructor') || 
        Object.prototype.hasOwnProperty.call(item, 'prototype')
      ) {
        continue;
      }

      const id = typeof item.id === 'string' || typeof item.id === 'number' ? String(item.id) : Math.random().toString(36).substring(2);
      const text = typeof item.text === 'string' ? item.text.trim() : '';
      const completed = Boolean(item.completed);
      const createdAt = typeof item.createdAt === 'number' ? item.createdAt : Date.now();

      if (text.length > 0) {
        validTodos.push({
          id,
          text,
          completed,
          createdAt,
        });
      }
    }
    return validTodos;
  } catch (e) {
    return null;
  }
}