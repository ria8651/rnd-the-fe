// Theme mode selection + application. Defaults to the OS light/dark preference,
// offers a manual override (light / dark / follow-system), and persists the
// choice. See ../../spec/ui-standards/theming.md#mode-selection.

import { signal } from '../framework/signal.ts';
import { themes, toCssVars, type ThemeName } from './tokens.ts';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'oms.theme-mode';

const systemPrefersDark = () =>
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;

function loadMode(): ThemeMode {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
}

export const themeMode = signal<ThemeMode>(loadMode());

/** The concrete theme actually rendered, after resolving "system". */
export const resolvedTheme = signal<ThemeName>('light');

function apply(name: ThemeName): void {
  const vars = toCssVars(themes[name]);
  const root = document.documentElement;
  for (const [prop, value] of Object.entries(vars)) {
    root.style.setProperty(prop, value);
  }
  root.dataset.theme = name;
  root.style.colorScheme = name;
  resolvedTheme.set(name);
}

function resolve(mode: ThemeMode): ThemeName {
  if (mode === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return mode;
}

export function setThemeMode(mode: ThemeMode): void {
  themeMode.set(mode);
  localStorage.setItem(STORAGE_KEY, mode);
  apply(resolve(mode));
}

export function initTheme(): void {
  apply(resolve(themeMode()));
  window
    .matchMedia?.('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      if (themeMode() === 'system') apply(resolve('system'));
    });
}
