import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [solidPlugin()],
  build: { target: 'esnext', rollupOptions: { input: 'index.html' } }
});