import { defineConfig, loadEnv } from 'vite';
import solid from 'vite-plugin-solid';

// The live open-mSupply GraphQL API. Proxied so the browser talks same-origin
// and we avoid CORS in dev. Override with VITE_GRAPHQL_TARGET if needed.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_GRAPHQL_TARGET ?? 'http://localhost:8000';
  return {
    plugins: [solid()],
    server: {
      port: 3010,
      proxy: {
        '/graphql': {
          target,
          changeOrigin: true,
        },
      },
    },
  };
});
