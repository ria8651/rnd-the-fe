/**
 * i18n context the chrome consumes (chrome/01-behaviours.md › Language selector).
 *
 * MOCK for Stage 3: tracks the current language, the available languages, and the
 * RTL flag, and persists the choice per user. There are no translation strings yet,
 * so `setLanguage` persists + flips document direction; the spec also calls for a
 * full reload so content re-renders — wired here behind `reloadOnChange` (off in dev
 * to avoid churn, on in the acceptance contract — AC-CH11). ⚠️ real string catalogues
 * arrive with the verticals.
 */
import { browser } from '$app/environment';
import { auth } from '$lib/auth/auth.svelte';

export interface Language {
	code: string;
	name: string;
	rtl?: boolean;
}

const LANGUAGES: Language[] = [
	{ code: 'en', name: 'English' },
	{ code: 'fr', name: 'Français' },
	{ code: 'es', name: 'Español' },
	{ code: 'pt', name: 'Português' },
	{ code: 'tet', name: 'Tetun' },
	{ code: 'ar', name: 'العربية', rtl: true }
];

const KEY = 'oms.language';

class I18nController {
	languages = $state<Language[]>(LANGUAGES);
	code = $state<string>('en');

	get current(): Language {
		return this.languages.find((l) => l.code === this.code) ?? this.languages[0];
	}
	get rtl() {
		return !!this.current.rtl;
	}

	init() {
		if (!browser) return;
		const stored = localStorage.getItem(this.scoped());
		if (stored && this.languages.some((l) => l.code === stored)) this.code = stored;
		this.applyDir();
	}

	setLanguage(code: string, reloadOnChange = false) {
		if (code === this.code) return;
		this.code = code;
		if (browser) {
			localStorage.setItem(this.scoped(), code);
			this.applyDir();
			// Spec: reload so all content re-renders in the new language (AC-CH11).
			if (reloadOnChange) location.reload();
		}
	}

	private applyDir() {
		if (browser) document.documentElement.dir = this.rtl ? 'rtl' : 'ltr';
	}

	private scoped() {
		return `${KEY}:${auth.user?.username ?? 'anon'}`;
	}
}

export const i18n = new I18nController();
