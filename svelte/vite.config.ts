import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// This is an internal supply-chain admin app, not a content site: we ship it as a
// client-rendered SPA (no SSR). adapter-static with a SPA fallback gives us file-based
// routing without a Node server. SSR is disabled globally in src/routes/+layout.ts.
export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({ fallback: 'index.html' })
		})
	],
	// Dev: proxy GraphQL to the local open-mSupply server (same-origin → no CORS).
	server: {
		proxy: {
			'/graphql': { target: 'http://localhost:8000', changeOrigin: true }
		}
	}
});
