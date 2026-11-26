import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId() {
  return crypto.randomUUID();
}

export function safeJsonParse(json: string) {
  try {
    const parsed = JSON.parse(json);
    // Basic prototype pollution protection
    if (typeof parsed === 'object' && parsed !== null) {
      if ('__proto__' in parsed || 'constructor' in parsed || 'prototype' in parsed) {
        return null;
      }
    }
    return parsed;
  } catch {
    return null;
  }
}