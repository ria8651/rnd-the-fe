// Minimal i18n: current language (persisted per user), a small dictionary, RTL
// handling, and switch-and-reload (chrome.md § language-selector).
import { signal } from '../core/signal';

export interface Language {
  code: string;
  name: string;
  rtl?: boolean;
}

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
  { code: 'es', name: 'Español' },
  { code: 'ar', name: 'العربية', rtl: true },
];

const DICT: Record<string, Record<string, string>> = {
  en: {},
  fr: {
    Stocktakes: 'Inventaires',
    'New stocktake': 'Nouvel inventaire',
    Inventory: 'Inventaire',
    Status: 'Statut',
    New: 'Nouveau',
    Finalised: 'Finalisé',
    Description: 'Description',
    Comment: 'Commentaire',
    Filters: 'Filtres',
  },
  es: {
    Stocktakes: 'Inventarios',
    'New stocktake': 'Nuevo inventario',
    Inventory: 'Inventario',
    Status: 'Estado',
    New: 'Nuevo',
    Finalised: 'Finalizado',
    Description: 'Descripción',
    Comment: 'Comentario',
    Filters: 'Filtros',
  },
  ar: {
    Stocktakes: 'الجرد',
    'New stocktake': 'جرد جديد',
    Inventory: 'المخزون',
    Status: 'الحالة',
    New: 'جديد',
    Finalised: 'مُنجز',
    Description: 'الوصف',
    Comment: 'تعليق',
    Filters: 'عوامل التصفية',
  },
};

const KEY = 'oms.lang';
const [langGet, langSet] = signal<string>(localStorage.getItem(KEY) || 'en');
export const currentLanguage = langGet;

export function language(): Language {
  return LANGUAGES.find((l) => l.code === langGet()) ?? LANGUAGES[0];
}

export function t(key: string): string {
  return DICT[langGet()]?.[key] ?? key;
}

export function applyDirection() {
  document.documentElement.dir = language().rtl ? 'rtl' : 'ltr';
  document.documentElement.lang = langGet();
}

export function setLanguage(code: string) {
  if (code === langGet()) return;
  localStorage.setItem(KEY, code);
  langSet(code);
  applyDirection();
  // Reload so all content re-renders in the new language (chrome AC-CH11).
  location.reload();
}
