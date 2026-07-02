// Data-driven nav: (icon, label, area, href, group, visible). The sidebar and
// mobile drawer both render from this; the top bar reads the active section's
// icon/label from it (chrome 01-behaviours § sidebar).
import { hasPermission } from '../context/auth';

export interface NavSection {
  label: string;
  icon: string;
  area: string; // first path segment after store
  vertical?: string; // default landing vertical
  group: 'upper' | 'lower';
  external?: string; // external link (Help/Docs)
  visible?: () => boolean;
}

export const NAV_SECTIONS: NavSection[] = [
  { label: 'Dashboard', icon: 'dashboard', area: 'dashboard', group: 'upper' },
  { label: 'Replenishment', icon: 'suppliers', area: 'replenishment', group: 'upper' },
  { label: 'Inventory', icon: 'stock', area: 'inventory', vertical: 'stocktakes', group: 'upper' },
  { label: 'Distribution', icon: 'truck', area: 'distribution', group: 'upper' },
  { label: 'Dispensary', icon: 'customers', area: 'dispensary', group: 'upper' },
  { label: 'Cold Chain', icon: 'thermometer', area: 'cold-chain', group: 'upper' },
  { label: 'Programs', icon: 'invoice', area: 'programs', group: 'upper' },
  { label: 'Reports', icon: 'reports', area: 'reports', group: 'upper' },
  { label: 'Catalogue', icon: 'list', area: 'catalogue', group: 'lower' },
  { label: 'Manage', icon: 'sliders', area: 'manage', group: 'lower', visible: () => hasPermission('manage') },
  { label: 'Settings', icon: 'settings', area: 'settings', group: 'lower', visible: () => hasPermission('settings') },
  { label: 'Sync status', icon: 'radio', area: 'sync', group: 'lower' },
  { label: 'Help', icon: 'help', area: 'help', group: 'lower' },
];

export function sectionHref(storeId: string, section: NavSection): string {
  const tail = section.vertical ? `${section.area}/${section.vertical}` : section.area;
  return `/${storeId}/${tail}`;
}

export function visibleSections(): NavSection[] {
  return NAV_SECTIONS.filter((s) => !s.visible || s.visible());
}

export function activeSection(area: string | undefined): NavSection | undefined {
  return NAV_SECTIONS.find((s) => s.area === area);
}
