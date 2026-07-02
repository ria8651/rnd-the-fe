// Data-driven nav model (spec chrome/01-behaviours.md › sidebar). Two groups
// (upper/lower). Each entry pairs an icon + label + route. Only stocktakes is
// implemented; the rest are placeholders so the shell renders the full nav.
import type { IconName } from './icons/icons';

export type NavItem = {
  key: string;
  label: string;
  icon: IconName;
  area?: string; // path segment under the store
  vertical?: string;
  implemented?: boolean;
};

export const NAV_UPPER: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', area: 'dashboard' },
  { key: 'replenishment', label: 'Replenishment', icon: 'suppliers', area: 'replenishment' },
  {
    key: 'inventory',
    label: 'Inventory',
    icon: 'stock',
    area: 'inventory',
    vertical: 'stocktakes',
    implemented: true,
  },
  { key: 'distribution', label: 'Distribution', icon: 'truck', area: 'distribution' },
  { key: 'dispensary', label: 'Dispensary', icon: 'customers', area: 'dispensary' },
  { key: 'coldchain', label: 'Cold Chain', icon: 'thermometer', area: 'cold-chain' },
  { key: 'programs', label: 'Programs', icon: 'invoice', area: 'programs' },
  { key: 'reports', label: 'Reports', icon: 'reports', area: 'reports' },
];

export const NAV_LOWER: NavItem[] = [
  { key: 'catalogue', label: 'Catalogue', icon: 'list', area: 'catalogue' },
  { key: 'manage', label: 'Manage', icon: 'sliders', area: 'manage' },
  { key: 'settings', label: 'Settings', icon: 'settings', area: 'settings' },
  { key: 'sync', label: 'Sync status', icon: 'radio', area: 'sync' },
  { key: 'help', label: 'Help', icon: 'help', area: 'help' },
];

export const ALL_NAV = [...NAV_UPPER, ...NAV_LOWER];

/** The landing path for a store after switching (spec store selector). */
export function rootPath(storeId: string): string {
  return `/${storeId}/inventory/stocktakes`;
}

export function itemPath(storeId: string, item: NavItem): string {
  return `/${storeId}/${item.area}${item.vertical ? '/' + item.vertical : ''}`;
}
