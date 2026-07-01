import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  useContext,
  type ParentComponent,
} from 'solid-js';
import { darkTheme, lightTheme, themeToCssVars } from './tokens';

// Per theming.md#mode-selection: default to OS preference, offer a manual
// override (light / dark / follow-system), persist the choice per user.
export type ThemeMode = 'light' | 'dark' | 'system';
type Resolved = 'light' | 'dark';

const STORAGE_KEY = 'oms.themeMode';

interface ThemeCtx {
  mode: () => ThemeMode;
  resolved: () => Resolved;
  setMode: (m: ThemeMode) => void;
}

const Context = createContext<ThemeCtx>();

export const ThemeProvider: ParentComponent = (props) => {
  const stored = (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) ?? 'system';
  const [mode, setModeSignal] = createSignal<ThemeMode>(stored);

  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  const [systemDark, setSystemDark] = createSignal(mql.matches);
  const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
  mql.addEventListener('change', onChange);
  onCleanup(() => mql.removeEventListener('change', onChange));

  const resolved = createMemo<Resolved>(() => {
    const m = mode();
    if (m === 'system') return systemDark() ? 'dark' : 'light';
    return m;
  });

  const setMode = (m: ThemeMode) => {
    setModeSignal(m);
    localStorage.setItem(STORAGE_KEY, m);
  };

  // Apply the resolved theme's roles as CSS custom properties on <html>, and
  // set a color-scheme + data attribute so native controls and CSS can react.
  createEffect(() => {
    const vars = themeToCssVars(resolved() === 'dark' ? darkTheme : lightTheme);
    const root = document.documentElement;
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
    root.dataset.theme = resolved();
    root.style.colorScheme = resolved();
  });

  return (
    <Context.Provider value={{ mode, resolved, setMode }}>
      {props.children}
    </Context.Provider>
  );
};

export function useTheme(): ThemeCtx {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
