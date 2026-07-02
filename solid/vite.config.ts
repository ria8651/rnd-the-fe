import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

// The app talks to the open-mSupply GraphQL API. In dev, Vite proxies
// /graphql -> localhost:8000 (auth is off in dev), so the client uses a
// single same-origin transport seam (see src/lib/graphql.ts).
export default defineConfig({
  plugins: [solid()],
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
