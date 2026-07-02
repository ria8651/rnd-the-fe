import { createSignal, createRoot, createEffect } from 'solid-js';

/*
 * Minimal i18n stand-in (chrome consumes i18n; a full catalogue is out of scope).
 * Supports the chrome's language selector behaviour: switching persists the choice
 * and reloads so all content re-renders; RTL languages flip layout direction.
 */

export interface Language {
  code: string;
  label: string;
  rtl: boolean;
}

export const LANGUAGES: Language[] = [
  { code: 'en', label: 'English', rtl: false },
  { code: 'fr', label: 'Français', rtl: false },
  { code: 'es', label: 'Español', rtl: false },
  { code: 'pt', label: 'Português', rtl: false },
  { code: 'ar', label: 'العربية', rtl: true },
  { code: 'tet', label: 'Tetum', rtl: false },
];

const STORAGE_KEY = 'oms.lang';

function readStored(): string {
  return localStorage.getItem(STORAGE_KEY) ?? 'en';
}

const [language, setLanguageSignal] = createSignal<string>(readStored());

export { language };

export function currentLanguage(): Language {
  return LANGUAGES.find((l) => l.code === language()) ?? LANGUAGES[0]!;
}

createRoot(() => {
  createEffect(() => {
    document.documentElement.setAttribute('lang', language());
    document.documentElement.setAttribute('dir', currentLanguage().rtl ? 'rtl' : 'ltr');
  });
});

export function setLanguage(code: string): void {
  if (code === language()) return;
  localStorage.setItem(STORAGE_KEY, code);
  setLanguageSignal(code);
  // Reload so all content re-renders in the new language (chrome behaviour).
  location.reload();
}

/** Trivial translator: returns the fallback (English) text. A real catalogue would key off `language()`. */
export function t(_key: string, fallback: string): string {
  return fallback;
}
