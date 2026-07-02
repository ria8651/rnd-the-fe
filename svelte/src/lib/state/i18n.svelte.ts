// i18n — the chrome consumes a language context (current language, available options,
// RTL flag, change-language that persists per user and reloads). Translation itself is
// mocked (English strings only) for this build; the selector behaviour is real
// (spec chrome/01-behaviours.md › language selector, AC-CH10/11/12).

export type Language = { code: string; name: string; rtl: boolean };

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', rtl: false },
  { code: 'fr', name: 'Français', rtl: false },
  { code: 'es', name: 'Español', rtl: false },
  { code: 'pt', name: 'Português', rtl: false },
  { code: 'ar', name: 'العربية', rtl: true },
  { code: 'tet', name: 'Tetum', rtl: false },
];

const KEY = 'oms.language';

class I18nState {
  code = $state<string>('en');

  constructor() {
    const stored = localStorage.getItem(KEY);
    if (stored && LANGUAGES.some((l) => l.code === stored)) this.code = stored;
    this.applyDir();
  }

  get current(): Language {
    return LANGUAGES.find((l) => l.code === this.code) ?? LANGUAGES[0];
  }

  private applyDir() {
    document.documentElement.dir = this.current.rtl ? 'rtl' : 'ltr';
    document.documentElement.lang = this.code;
  }

  /** Persist for the user and reload so content re-renders in the new language. */
  change(code: string) {
    if (code === this.code) return;
    localStorage.setItem(KEY, code);
    this.code = code;
    this.applyDir();
    window.location.reload();
  }
}

export const i18n = new I18nState();
