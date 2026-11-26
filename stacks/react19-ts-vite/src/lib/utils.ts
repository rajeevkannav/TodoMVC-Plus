import { Todo } from '../types';

export const validateImport = (data: any): Todo[] => {
  if (!Array.isArray(data)) throw new Error('Invalid format');
  return data.filter(item => {
    const hasId = typeof item.id === 'string';
    const hasText = typeof item.text === 'string';
    const hasCompleted = typeof item.completed === 'boolean';
    // Prototype pollution check
    const safeKeys = !('__proto__' in item || 'constructor' in item || 'prototype' in item);
    return hasId && hasText && hasCompleted && safeKeys;
  });
};

export const announce = (message: string) => {
  const el = document.getElementById('aria-announcer');
  if (el) el.textContent = message;
};