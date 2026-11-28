import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; " +
  "connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'";

/** Strict CSP for production builds only (the dev server needs inline HMR code). */
function cspPlugin(): Plugin {
  return {
    name: 'todomvc-plus-csp',
    apply: 'build',
    transformIndexHtml() {
      return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' }];
    },
  };
}

export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [react(), cspPlugin()],
});
