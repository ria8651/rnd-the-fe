/**
 * Data-driven navigation (chrome/01-behaviours.md): the sidebar is a list of
 * (icon, label, route, visible?) entries in two groups — upper (scrollable) and
 * lower — not a hard-coded tree. Gating is per-item via `visible`. Icons are
 * emoji placeholders until an icon set is chosen.
 */
import { auth } from '$lib/auth/auth.svelte';

export interface NavItem {
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
			{ icon: '🏠', label: 'Dashboard', route: '/dashboard' },
			{ icon: '🔄', label: 'Replenishment', route: '/replenishment' },
			{ icon: '📦', label: 'Inventory', route: '/stocktakes' },
			{ icon: '🚚', label: 'Distribution', route: '/distribution' },
			{ icon: '💊', label: 'Dispensary', route: '/dispensary' },
			{ icon: '❄️', label: 'Cold Chain', route: '/cold-chain' },
			{ icon: '📋', label: 'Programs', route: '/programs' },
			{ icon: '📊', label: 'Reports', route: '/reports' }
		]
	},
	{
		id: 'lower',
		items: [
			{ icon: '📚', label: 'Catalogue', route: '/catalogue' },
			{ icon: '🛠', label: 'Manage', route: '/manage' },
			{ icon: '⚙️', label: 'Settings', route: '/settings', visible: () => auth.can('ServerAdmin') || auth.can('EditStore') },
			{ icon: '🔁', label: 'Sync status', route: '/sync' },
			{ icon: '❓', label: 'Help', route: '/help' }
		]
	}
];

/** Whether a nav route is active for the current pathname (prefix match). */
export function isActive(route: string, pathname: string): boolean {
	if (route === '/dashboard') return pathname === route;
	return pathname === route || pathname.startsWith(route + '/');
}
