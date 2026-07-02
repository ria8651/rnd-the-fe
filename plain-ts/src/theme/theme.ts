// Applies a Palette as CSS custom properties, handles mode selection
// (light/dark/system) with per-user persistence, and provides colour utilities
// (translucent conversion + automatic contrasting foreground for the store bar).
import { signal } from '../core/signal';
import { palettes, type Palette, type ThemeName } from './tokens';

export type ThemeMode = 'light' | 'dark' | 'system';

const MODE_KEY = 'oms.themeMode';

/** Convert '#RRGGBB' or '#RRGGBB @ NN%' to a CSS colour string. */
export function toCss(value: string): string {
  const m = /^(#[0-9A-Fa-f]{6})(?:\s*@\s*(\d+)%)?$/.exec(value.trim());
  if (!m) return value;
  const hex = m[1];
  if (!m[2]) return hex;
  const a = Number(m[2]) / 100;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** Relative luminance of an opaque hex, for contrast decisions. */
function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const rgb = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

/** Pick black or white for legible text on the given opaque background hex. */
export function contrastingText(bgHex: string): string {
  return luminance(bgHex) > 0.5 ? '#1C1C28' : '#FFFFFF';
}

function setVars(root: HTMLElement, prefix: string, obj: Record<string, unknown>) {
  for (const [key, value] of Object.entries(obj)) {
    const name = `${prefix}-${key.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}`;
    if (value && typeof value === 'object') setVars(root, name, value as Record<string, unknown>);
    else if (typeof value === 'string') root.style.setProperty(name, name.endsWith('button-radius') ? value : toCss(value));
  }
}

function applyPalette(p: Palette) {
  const root = document.documentElement;
  setVars(root, '-', p as unknown as Record<string, unknown>); // -> --brand-primary, --surface-base, ...
  // buttonRadius holds a var() reference, not a colour — set verbatim.
  root.style.setProperty('--button-radius', p.buttonRadius);
}

const media = window.matchMedia('(prefers-color-scheme: dark)');

function resolve(mode: ThemeMode): ThemeName {
  const themeOverride = localStorage.getItem('oms.themeName') as ThemeName | null;
  if (themeOverride === 'mui') return 'mui';
  if (mode === 'system') return media.matches ? 'dark' : 'light';
  return mode;
}

const [modeGet, modeSet] = signal<ThemeMode>((localStorage.getItem(MODE_KEY) as ThemeMode) || 'system');
export const themeMode = modeGet;

const [nameGet, nameSet] = signal<ThemeName>(resolve(modeGet()));
export const themeName = nameGet;

function apply() {
  const name = resolve(modeGet());
  nameSet(name);
  applyPalette(palettes[name]);
  document.documentElement.dataset.theme = name;
}

export function setThemeMode(mode: ThemeMode) {
  modeSet(mode);
  localStorage.setItem(MODE_KEY, mode);
  localStorage.removeItem('oms.themeName');
  apply();
}

export function setThemeName(name: ThemeName) {
  localStorage.setItem('oms.themeName', name);
  apply();
}

media.addEventListener('change', () => {
  if (modeGet() === 'system') apply();
});

export function initTheme() {
  apply();
}
