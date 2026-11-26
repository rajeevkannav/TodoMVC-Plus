import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

// Mock BroadcastChannel
class MockBroadcastChannel {
  name: string;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  constructor(name: string) { this.name = name; }
  postMessage() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() { return true; }
}

vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IndexedDB
const indexedDB = {
  open: vi.fn().mockReturnValue({
    onupgradeneeded: null,
    onsuccess: null,
    onerror: null,
  }),
};
vi.stubGlobal('indexedDB', indexedDB);