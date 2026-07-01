import { createContext, useContext, useMemo, type ReactNode } from 'react';

/**
 * Minimal i18n providing what chrome consumes (spec/chrome/00-overview.md):
 * current language + name, available languages, an RTL flag, change-language,
 * and per-user persistence. Switching persists and reloads so content re-renders
 * in the new language (AC-CH11); RTL languages flip layout direction (AC-CH12).
 */
export interface Language {
  code: string;
  name: string;
  rtl?: boolean;
}

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English' },
  { code: 'tet', name: 'Tetum' },
  { code: 'pt', name: 'Português' },
  { code: 'fr', name: 'Français' },
  { code: 'es', name: 'Español' },
  { code: 'ar', name: 'العربية', rtl: true },
  { code: 'km', name: 'ខ្មែរ' },
  { code: 'ru', name: 'Русский' },
];

const LANG_KEY = 'oms.language';

type Dict = Record<string, string>;

// Partial dictionaries — enough that switching visibly changes the UI. English
// is the base; missing keys fall back to English (then to the key itself).
const DICTS: Record<string, Dict> = {
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.replenishment': 'Replenishment',
    'nav.inventory': 'Inventory',
    'nav.distribution': 'Distribution',
    'nav.dispensary': 'Dispensary',
    'nav.coldchain': 'Cold Chain',
    'nav.programs': 'Programs',
    'nav.reports': 'Reports',
    'nav.catalogue': 'Catalogue',
    'nav.manage': 'Manage',
    'nav.settings': 'Settings',
    'nav.sync': 'Sync status',
    'nav.help': 'Help',
    'stocktakes.title': 'Stocktakes',
    'action.newStocktake': 'New stocktake',
    'bottombar.edit': 'Edit',
  },
  tet: {
    'nav.dashboard': 'Painél',
    'nav.inventory': 'Inventáriu',
    'nav.reports': 'Relatóriu',
    'nav.settings': 'Konfigurasaun',
    'nav.help': 'Ajuda',
    'stocktakes.title': 'Kontajen Stok',
    'action.newStocktake': 'Kontajen foun',
  },
  pt: {
    'nav.dashboard': 'Painel',
    'nav.inventory': 'Inventário',
    'nav.reports': 'Relatórios',
    'nav.settings': 'Configurações',
    'nav.help': 'Ajuda',
    'stocktakes.title': 'Inventários',
    'action.newStocktake': 'Novo inventário',
  },
  ar: {
    'nav.dashboard': 'لوحة القيادة',
    'nav.inventory': 'المخزون',
    'nav.reports': 'التقارير',
    'nav.settings': 'الإعدادات',
    'stocktakes.title': 'الجرد',
    'action.newStocktake': 'جرد جديد',
  },
};

interface I18nContextValue {
  language: Language;
  languages: Language[];
  rtl: boolean;
  setLanguage: (code: string) => void;
  t: (key: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function getStoredLanguage(): Language {
  const code = localStorage.getItem(LANG_KEY) ?? 'en';
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

/** Apply <html lang/dir> from the stored language at boot (before React renders). */
export function applyDocumentLanguage() {
  const lang = getStoredLanguage();
  document.documentElement.lang = lang.code;
  document.documentElement.dir = lang.rtl ? 'rtl' : 'ltr';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const language = getStoredLanguage();

  const value = useMemo<I18nContextValue>(() => {
    const dict = DICTS[language.code] ?? {};
    const base = DICTS.en;
    return {
      language,
      languages: LANGUAGES,
      rtl: !!language.rtl,
      setLanguage: (code: string) => {
        localStorage.setItem(LANG_KEY, code);
        // Persist + reload so all content re-renders in the new language (AC-CH11).
        window.location.reload();
      },
      t: (key: string, fallback?: string) => dict[key] ?? base[key] ?? fallback ?? key,
    };
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export function useTranslation() {
  return useI18n().t;
}
