import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

// Dev server proxies GraphQL to the live open-mSupply server so the browser
// talks to a same-origin path (no CORS config needed on the server).
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/graphql': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
