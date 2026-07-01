/**
 * Data-driven navigation (spec/chrome/01-behaviours.md): the sidebar is a list of
 * (icon, label, route, visible?) entries in two groups — upper (scrollable) and lower — not
 * a hard-coded tree. Gating is per-item via `visible`. Icons follow the nav-section map in
 * spec/ui-standards/icons.md › Primary navigation sections.
 */
import type { IconName } from '../ui/Icon';
import { auth } from '../state/auth';

export interface NavItem {
  icon: IconName;
  label: string;
  route: string;
  /** Hidden when this returns false (store-type / permission gating). Defaults visible. */
  visible?: () => boolean;
  external?: boolean;
}

export interface NavGroup {
  id: 'upper' | 'lower';
  items: NavItem[];
}

/** The post-store-switch / post-login landing route. */
export const ROOT_PATH = '/dashboard';

export const navGroups: NavGroup[] = [
  {
    id: 'upper',
    items: [
      { icon: 'dashboard', label: 'Dashboard', route: '/dashboard' },
      { icon: 'suppliers', label: 'Replenishment', route: '/replenishment' },
      { icon: 'stock', label: 'Inventory', route: '/stocktakes' },
      { icon: 'truck', label: 'Distribution', route: '/distribution' },
      { icon: 'customers', label: 'Dispensary', route: '/dispensary' },
      { icon: 'thermometer', label: 'Cold Chain', route: '/cold-chain' },
      { icon: 'invoice', label: 'Programs', route: '/programs' },
      { icon: 'reports', label: 'Reports', route: '/reports' }
    ]
  },
  {
    id: 'lower',
    items: [
      { icon: 'list', label: 'Catalogue', route: '/catalogue' },
      { icon: 'sliders', label: 'Manage', route: '/manage' },
      {
        icon: 'settings',
        label: 'Settings',
        route: '/settings',
        visible: () => auth.can('ServerAdmin') || auth.can('EditStore')
      },
      { icon: 'radio', label: 'Sync status', route: '/sync' },
      { icon: 'help', label: 'Help', route: '/help' }
    ]
  }
];

const ALL_ITEMS = navGroups.flatMap((g) => g.items);

/** Whether a nav route is active for the current pathname (prefix match). */
export function isActive(route: string, pathname: string): boolean {
  if (route === '/dashboard') return pathname === route || pathname === '/';
  return pathname === route || pathname.startsWith(route + '/');
}

/** The nav item that owns the current path (for the top-bar section icon + breadcrumb). */
export function activeNavItem(pathname: string): NavItem | undefined {
  return ALL_ITEMS.find((i) => isActive(i.route, pathname));
}
