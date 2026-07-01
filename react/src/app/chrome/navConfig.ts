import type { IconName } from '@/icons/Icon';

/**
 * Data-driven nav: a list of (icon, label, route, group) entries, per
 * spec/chrome/01-behaviours.md — not a hard-coded tree. Icons follow the
 * nav-section icon map in spec/ui-standards/icons.md.
 */
export interface NavSection {
  key: string;
  labelKey: string;
  icon: IconName;
  path: string;
  group: 'upper' | 'lower';
  /** Optional permission gate (spec AC-CH3). */
  permission?: string;
  /** External link (opens in a new tab). */
  external?: boolean;
}

export const NAV_SECTIONS: NavSection[] = [
  { key: 'dashboard', labelKey: 'nav.dashboard', icon: 'dashboard', path: '/dashboard', group: 'upper' },
  { key: 'replenishment', labelKey: 'nav.replenishment', icon: 'suppliers', path: '/replenishment', group: 'upper' },
  { key: 'inventory', labelKey: 'nav.inventory', icon: 'stock', path: '/inventory/stocktakes', group: 'upper' },
  { key: 'distribution', labelKey: 'nav.distribution', icon: 'truck', path: '/distribution', group: 'upper' },
  { key: 'dispensary', labelKey: 'nav.dispensary', icon: 'customers', path: '/dispensary', group: 'upper' },
  { key: 'coldchain', labelKey: 'nav.coldchain', icon: 'thermometer', path: '/cold-chain', group: 'upper' },
  { key: 'programs', labelKey: 'nav.programs', icon: 'invoice', path: '/programs', group: 'upper' },
  { key: 'reports', labelKey: 'nav.reports', icon: 'reports', path: '/reports', group: 'upper' },

  { key: 'catalogue', labelKey: 'nav.catalogue', icon: 'list', path: '/catalogue', group: 'lower' },
  { key: 'manage', labelKey: 'nav.manage', icon: 'sliders', path: '/manage', group: 'lower' },
  { key: 'settings', labelKey: 'nav.settings', icon: 'settings', path: '/settings', group: 'lower', permission: 'ServerAdmin' },
  { key: 'sync', labelKey: 'nav.sync', icon: 'radio', path: '/sync', group: 'lower' },
  { key: 'help', labelKey: 'nav.help', icon: 'help', path: '/help', group: 'lower' },
];

/** Post-store-switch landing path (spec chrome: "root navigation path"). */
export const ROOT_PATH = '/dashboard';
