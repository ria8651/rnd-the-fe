import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import solid from 'vite-plugin-solid';

// Internal supply-chain admin app, not a content site: shipped as a client-rendered SPA
// (no SSR). Vite serves index.html as the SPA fallback and @solidjs/router owns routing.
export default defineConfig(({ mode }) => {
  // Override the API host in dev with VITE_API_TARGET (e.g. `VITE_API_TARGET=http://box:8000`),
  // in a `.env.local` file or inline. `/graphql` is proxied to it (same-origin → no CORS).
  // The client endpoint itself can also be overridden with VITE_GRAPHQL_URL (see api/graphql.ts).
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_TARGET || 'http://localhost:8000';

  return {
    plugins: [solid()],
    resolve: {
      alias: { '~': fileURLToPath(new URL('./src', import.meta.url)) }
    },
    server: {
      port: 5180,
      proxy: {
        '/graphql': { target: apiTarget, changeOrigin: true }
      }
    },
    test: {
      // Rules-engine unit tests are pure functions — no DOM needed.
      environment: 'node',
      include: ['src/**/*.test.ts']
    }
  };
});
