import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

// Mock BroadcastChannel
if (typeof window !== 'undefined') {
  window.BroadcastChannel = vi.fn().mockImplementation(() => ({
    postMessage: vi.fn(),
    close: vi.fn(),
    onmessage: null,
  }));

  window.matchMedia = vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

  // Mock View Transitions
  document.startViewTransition = (cb: () => void) => {
    cb();
    return { finished: Promise.resolve(), ready: Promise.resolve(), updateCallbackDone: Promise.resolve() } as any;
  };
}