import { defineConfig } from 'vite';

// Plain-TS build — no framework plugin. The dev GraphQL server (localhost:8000)
// is proxied under /graphql so the app talks to a same-origin path.
export default defineConfig({
  server: {
    port: 5480,
    strictPort: true,
    proxy: {
      '/graphql': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
