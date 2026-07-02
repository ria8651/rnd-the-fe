import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// SPA build. The dev GraphQL server (localhost:8000, auth off in dev) is proxied
// under /graphql so the browser client speaks same-origin. See spec 02-api-contract.
export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 5180,
    proxy: {
      '/graphql': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
