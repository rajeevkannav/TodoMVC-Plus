import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type Filter = 'all' | 'active' | 'completed';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId() {
  return crypto.randomUUID();
}

export function safeJsonParse<T>(json: string, schema: { parse: (data: unknown) => T }): T | null {
  try {
    const parsed = JSON.parse(json);
    if (json.includes('__proto__') || json.includes('constructor') || json.includes('prototype')) {
      return null;
    }
    return schema.parse(parsed);
  } catch {
    return null;
  }
}
