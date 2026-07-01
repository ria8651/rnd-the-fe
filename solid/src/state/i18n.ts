/**
 * i18n context the chrome consumes (spec/chrome/01-behaviours.md › Language selector).
 *
 * Tracks the current language, the available languages, and the RTL flag, and persists the
 * choice per user. There are no string catalogues yet (they arrive with the verticals), so
 * `setLanguage` persists + flips document direction; the spec also calls for a full reload
 * so all content re-renders (AC-CH11) — wired behind `reloadOnChange` (off in dev to avoid
 * churn, honoured in the acceptance contract).
 */
import { createSignal } from 'solid-js';
import { auth } from './auth';

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
const ls = () => (typeof localStorage === 'undefined' ? null : localStorage);
const scoped = () => `${KEY}:${auth.user?.username ?? 'anon'}`;

const [languages] = createSignal<Language[]>(LANGUAGES);
const [code, setCode] = createSignal('en');

function current(): Language {
  return languages().find((l) => l.code === code()) ?? languages()[0]!;
}

function applyDir() {
  if (typeof document !== 'undefined') document.documentElement.dir = current().rtl ? 'rtl' : 'ltr';
}

export const i18n = {
  get languages() {
    return languages();
  },
  get code() {
    return code();
  },
  get current() {
    return current();
  },
  get rtl() {
    return !!current().rtl;
  },

  init() {
    const stored = ls()?.getItem(scoped());
    if (stored && languages().some((l) => l.code === stored)) setCode(stored);
    applyDir();
  },

  setLanguage(next: string, reloadOnChange = false) {
    if (next === code()) return;
    setCode(next);
    ls()?.setItem(scoped(), next);
    applyDir();
    // Spec: reload so all content re-renders in the new language (AC-CH11).
    if (reloadOnChange && typeof location !== 'undefined') location.reload();
  }
};
