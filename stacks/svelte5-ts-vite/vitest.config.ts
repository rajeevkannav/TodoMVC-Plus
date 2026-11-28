import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  // Resolve Svelte's browser build so `mount` works in jsdom.
  resolve: { conditions: ['browser'] },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**'],
    setupFiles: ['./vitest.setup.ts']
  }
});
