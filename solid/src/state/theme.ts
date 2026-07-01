/**
 * Theme-mode controller (spec/ui-standards/theming.md › Mode selection, D2).
 *
 * Default: follow the OS preference (`prefers-color-scheme`). A manual override
 * (light / dark / mui) wins and is persisted per user (re-keyed via `setUserScope` once
 * the signed-in user is known, alongside the language preference).
 *
 * The colour cascade is pure CSS (theme/tokens.css). This controller only flips the
 * `data-theme` attribute on <html>; in `system` mode it removes the attribute and lets the
 * media query decide, so there is no flash and no JS-applied colours. `color-scheme` is
 * kept in sync with the *resolved* theme so native controls match our surfaces.
 */
import { createSignal } from 'solid-js';

export type ThemeMode = 'system' | 'light' | 'dark' | 'mui';
export type ResolvedTheme = 'light' | 'dark' | 'mui';

const BASE_KEY = 'oms.theme';

const [mode, setMode] = createSignal<ThemeMode>('system');
const [systemDark, setSystemDark] = createSignal(false);
let scope = '';

const store = () => (typeof localStorage === 'undefined' ? null : localStorage);
const storageKey = () => (scope ? `${BASE_KEY}:${scope}` : BASE_KEY);

function resolve(): ResolvedTheme {
  const m = mode();
  if (m === 'system') return systemDark() ? 'dark' : 'light';
  return m;
}

function apply() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (mode() === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', mode());
  root.style.colorScheme = resolve() === 'dark' ? 'dark' : 'light';
}

function load() {
  const stored = store()?.getItem(storageKey());
  setMode(stored === 'light' || stored === 'dark' || stored === 'mui' || stored === 'system' ? stored : 'system');
}

export const theme = {
  get mode() {
    return mode();
  },
  /** The actually-applied theme after resolving `system`. */
  get resolved() {
    return resolve();
  },
  get systemPrefersDark() {
    return systemDark();
  },

  /** Call once on mount (browser only). */
  init() {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemDark(mql.matches);
    mql.addEventListener('change', (e) => {
      setSystemDark(e.matches);
      apply(); // keep color-scheme in sync when following the OS
    });
    load();
    apply();
  },

  /** Re-key the persisted preference once the signed-in user is known. */
  setUserScope(next: string) {
    scope = next;
    load();
    apply();
  },

  set(next: ThemeMode) {
    setMode(next);
    store()?.setItem(storageKey(), next);
    apply();
  }
};
