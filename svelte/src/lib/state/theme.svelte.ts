// Theme mode: light / dark / mui, with a "follow system" default (spec theming.md
// › mode selection). Persisted per user in localStorage; applied as data-theme on <html>.

export type ThemeChoice = 'system' | 'light' | 'dark' | 'mui';
type Resolved = 'light' | 'dark' | 'mui';

const KEY = 'oms.theme';

function systemPrefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

class ThemeState {
  choice = $state<ThemeChoice>('system');

  constructor() {
    const stored = localStorage.getItem(KEY) as ThemeChoice | null;
    if (stored) this.choice = stored;
    this.apply();
    // React to OS changes while on "follow system".
    window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.choice === 'system') this.apply();
    });
  }

  get resolved(): Resolved {
    if (this.choice === 'system') return systemPrefersDark() ? 'dark' : 'light';
    return this.choice;
  }

  set(choice: ThemeChoice) {
    this.choice = choice;
    localStorage.setItem(KEY, choice);
    this.apply();
  }

  private apply() {
    document.documentElement.setAttribute('data-theme', this.resolved);
  }
}

export const theme = new ThemeState();
