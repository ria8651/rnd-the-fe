/**
 * Data-driven navigation (chrome/01-behaviours.md): the sidebar is a list of
 * (icon, label, route, visible?) entries in two groups — upper (scrollable) and
 * lower — not a hard-coded tree. Gating is per-item via `visible`. Icons are
 * emoji placeholders until an icon set is chosen.
 */
import { auth } from '$lib/auth/auth.svelte';

export interface NavItem {
	/** Icon name from the spec set (ui-standards/icons). */
	icon: string;
	label: string;
	route: string;
	/** Hidden when false (store-type / permission gating). Defaults visible. */
	visible?: () => boolean;
	/** External link (e.g. Docs) opens in a new tab. */
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
			{ icon: 'refresh', label: 'Replenishment', route: '/replenishment' },
			{ icon: 'stock', label: 'Inventory', route: '/stocktakes' },
			{ icon: 'truck', label: 'Distribution', route: '/distribution' },
			{ icon: 'customers', label: 'Dispensary', route: '/dispensary' },
			{ icon: 'snowflake', label: 'Cold Chain', route: '/cold-chain' },
			{ icon: 'list', label: 'Programs', route: '/programs' },
			{ icon: 'reports', label: 'Reports', route: '/reports' }
		]
	},
	{
		id: 'lower',
		items: [
			{ icon: 'book', label: 'Catalogue', route: '/catalogue' },
			{ icon: 'sliders', label: 'Manage', route: '/manage' },
			{ icon: 'settings', label: 'Settings', route: '/settings', visible: () => auth.can('ServerAdmin') || auth.can('EditStore') },
			{ icon: 'refresh', label: 'Sync status', route: '/sync' },
			{ icon: 'help', label: 'Help', route: '/help' }
		]
	}
];

/** Whether a nav route is active for the current pathname (prefix match). */
export function isActive(route: string, pathname: string): boolean {
	if (route === '/dashboard') return pathname === route;
	return pathname === route || pathname.startsWith(route + '/');
}
