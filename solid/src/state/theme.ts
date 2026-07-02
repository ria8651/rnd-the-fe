import { createSignal, createEffect, createRoot } from 'solid-js';

/*
 * Theme mode selection (theming.md#mode-selection): default to the OS light/dark
 * preference; offer a manual override (light / dark / mui / follow-system);
 * persist the choice. The applied [data-theme] is resolved from the mode.
 */

export type ThemeMode = 'system' | 'light' | 'dark' | 'mui';
export type ResolvedTheme = 'light' | 'dark' | 'mui';

const STORAGE_KEY = 'oms.theme';

function readStored(): ThemeMode {
  const v = localStorage.getItem(STORAGE_KEY);
  return v === 'light' || v === 'dark' || v === 'mui' || v === 'system' ? v : 'system';
}

const mql = window.matchMedia('(prefers-color-scheme: dark)');
const [systemDark, setSystemDark] = createSignal(mql.matches);
mql.addEventListener('change', (e) => setSystemDark(e.matches));

const [mode, setModeSignal] = createSignal<ThemeMode>(readStored());

export function resolvedTheme(): ResolvedTheme {
  const m = mode();
  if (m === 'system') return systemDark() ? 'dark' : 'light';
  return m;
}

createRoot(() => {
  createEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme());
  });
});

export { mode as themeMode };

export function setThemeMode(next: ThemeMode): void {
  localStorage.setItem(STORAGE_KEY, next);
  setModeSignal(next);
}

/** Cycle for a simple toggle control: light → dark → mui → system → light. */
export function cycleTheme(): void {
  const order: ThemeMode[] = ['light', 'dark', 'mui', 'system'];
  const i = order.indexOf(mode());
  setThemeMode(order[(i + 1) % order.length]!);
}
