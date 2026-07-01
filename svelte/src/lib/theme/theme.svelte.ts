/**
 * Theme-mode controller (theming.md › Mode selection).
 *
 * Default: follow the OS preference (`prefers-color-scheme`). A manual override
 * (light / dark) wins and is persisted. Per the spec this preference is per-user
 * and lives alongside language — until auth lands (Stage 3) we persist it under a
 * single key; `setUserScope()` lets the chrome re-key it by username later.
 *
 * The colour cascade is pure CSS (see tokens.css). This controller only flips the
 * `data-theme` attribute on <html>; in `system` mode it removes the attribute and
 * lets the media query decide, so there's no flash and no JS-applied colours.
 */
import { browser } from '$app/environment';

export type ThemeMode = 'system' | 'light' | 'dark' | 'mui';
export type ResolvedTheme = 'light' | 'dark' | 'mui';

const BASE_KEY = 'oms.theme';

class ThemeController {
	mode = $state<ThemeMode>('system');
	/** Whether the OS currently prefers dark — tracked so the UI can show the resolved mode. */
	systemPrefersDark = $state(false);

	#scope = '';
	#mql: MediaQueryList | null = null;

	get storageKey() {
		return this.#scope ? `${BASE_KEY}:${this.#scope}` : BASE_KEY;
	}

	/** The actually-applied theme after resolving `system`. */
	get resolved(): ResolvedTheme {
		if (this.mode === 'system') return this.systemPrefersDark ? 'dark' : 'light';
		return this.mode;
	}

	/** Call once on mount (browser only). */
	init() {
		if (!browser) return;
		this.#mql = window.matchMedia('(prefers-color-scheme: dark)');
		this.systemPrefersDark = this.#mql.matches;
		this.#mql.addEventListener('change', (e) => (this.systemPrefersDark = e.matches));
		this.#load();
		this.#apply();
	}

	/** Re-key the persisted preference once we know the signed-in user (Stage 3). */
	setUserScope(scope: string) {
		this.#scope = scope;
		this.#load();
		this.#apply();
	}

	set(mode: ThemeMode) {
		this.mode = mode;
		if (browser) localStorage.setItem(this.storageKey, mode);
		this.#apply();
	}

	#load() {
		if (!browser) return;
		const stored = localStorage.getItem(this.storageKey);
		this.mode =
			stored === 'light' || stored === 'dark' || stored === 'mui' || stored === 'system'
				? stored
				: 'system';
	}

	#apply() {
		if (!browser) return;
		const root = document.documentElement;
		if (this.mode === 'system') root.removeAttribute('data-theme');
		else root.setAttribute('data-theme', this.mode);
	}
}

export const theme = new ThemeController();
