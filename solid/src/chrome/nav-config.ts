import type { IconName } from '../ui/Icon';

/*
 * The navigation is a data-driven list of (icon, label, route, group) entries with
 * two groups (upper/lower), per chrome/01-behaviours.md#sidebar. Section→icon map is
 * icons.md#primary-navigation-sections-chrome. Routes are store-scoped
 * (urls.md#path-layout): /{store}/{area}/…. Only Inventory→Stocktakes is a built
 * vertical here; other sections land on a placeholder.
 */

export interface NavSection {
  key: string;
  label: string;
  icon: IconName;
  area: string;
  group: 'upper' | 'lower';
  /** Landing path within the store (relative to /{storeId}). */
  path: string;
  /** Permission/store-type gated sections may be hidden (config detail). */
  gated?: boolean;
}

export const NAV_SECTIONS: NavSection[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', area: 'dashboard', group: 'upper', path: 'dashboard' },
  { key: 'replenishment', label: 'Replenishment', icon: 'suppliers', area: 'replenishment', group: 'upper', path: 'replenishment' },
  { key: 'inventory', label: 'Inventory', icon: 'stock', area: 'inventory', group: 'upper', path: 'inventory/stocktakes' },
  { key: 'distribution', label: 'Distribution', icon: 'truck', area: 'distribution', group: 'upper', path: 'distribution' },
  { key: 'dispensary', label: 'Dispensary', icon: 'customers', area: 'dispensary', group: 'upper', path: 'dispensary' },
  { key: 'cold-chain', label: 'Cold Chain', icon: 'thermometer', area: 'cold-chain', group: 'upper', path: 'cold-chain' },
  { key: 'programs', label: 'Programs', icon: 'invoice', area: 'programs', group: 'upper', path: 'programs' },
  { key: 'reports', label: 'Reports', icon: 'reports', area: 'reports', group: 'upper', path: 'reports' },
  { key: 'catalogue', label: 'Catalogue', icon: 'list', area: 'catalogue', group: 'lower', path: 'catalogue' },
  { key: 'manage', label: 'Manage', icon: 'sliders', area: 'manage', group: 'lower', path: 'manage' },
  { key: 'settings', label: 'Settings', icon: 'settings', area: 'settings', group: 'lower', path: 'settings', gated: true },
  { key: 'sync', label: 'Sync status', icon: 'radio', area: 'sync', group: 'lower', path: 'sync' },
  { key: 'help', label: 'Help', icon: 'help', area: 'help', group: 'lower', path: 'help' },
];

export function sectionForArea(area: string | undefined): NavSection | undefined {
  return NAV_SECTIONS.find((s) => s.area === area);
}
