/**
 * Auth context the chrome consumes (chrome/00-overview.md › Key dependencies).
 *
 * MOCK for Stage 3 — a stand-in for the real session so the shell is demonstrable
 * before login + live GraphQL land (Stage 4). It exposes exactly what the chrome
 * needs: the current user, the active store, the user's stores, a token, and a
 * permission check. The shape is what the real adapter will populate.
 */
import { browser } from '$app/environment';

export interface User {
	username: string;
	email: string;
	firstName: string;
	lastName: string;
	jobTitle: string;
}

export interface Store {
	id: string;
	name: string;
	code: string;
	/** On-hold stores are shown but not selectable (labelled). */
	isOnHold?: boolean;
	/** Disabled stores are not selectable. */
	isDisabled?: boolean;
}

export type Permission = 'ServerAdmin' | 'StoreAccess' | 'EditStore';

const MOCK_USER: User = {
	username: 'mosadmin',
	email: 'admin@msupply.foundation',
	firstName: 'Mary',
	lastName: 'Osman',
	jobTitle: 'Store manager'
};

const MOCK_STORES: Store[] = [
	{ id: 'store-a', name: 'Central Medical Store', code: 'CMS' },
	{ id: 'store-b', name: 'Northern Regional Warehouse', code: 'NRW' },
	{ id: 'store-c', name: 'Dili District Pharmacy', code: 'DDP' },
	{ id: 'store-d', name: 'Cold Chain Hub', code: 'CCH', isOnHold: true },
	{ id: 'store-e', name: 'Decommissioned Depot', code: 'DEP', isDisabled: true }
];

const STORE_KEY = 'oms.activeStore';
const REMEMBER_KEY = 'oms.rememberStore';

class AuthController {
	user = $state<User | null>(MOCK_USER);
	stores = $state<Store[]>(MOCK_STORES);
	storeId = $state<string>(MOCK_STORES[0].id);
	token = $state<string | null>('mock-token');
	/** Per-user "skip the store selector at login" preference. */
	rememberStoreChoice = $state(false);

	get isAuthenticated() {
		return !!this.user && !!this.token;
	}

	get currentStore(): Store | undefined {
		return this.stores.find((s) => s.id === this.storeId);
	}

	/** Permission gate. Mock grants everything except server-admin. */
	can(permission: Permission): boolean {
		return permission !== 'ServerAdmin';
	}

	init() {
		if (!browser || !this.user) return;
		const storedStore = localStorage.getItem(this.scoped(STORE_KEY));
		if (storedStore && this.stores.some((s) => s.id === storedStore)) this.storeId = storedStore;
		this.rememberStoreChoice = localStorage.getItem(this.scoped(REMEMBER_KEY)) === 'true';
	}

	setStore(id: string) {
		const store = this.stores.find((s) => s.id === id);
		if (!store || store.isDisabled || store.isOnHold) return;
		this.storeId = id;
		if (browser) localStorage.setItem(this.scoped(STORE_KEY), id);
	}

	setRememberStoreChoice(value: boolean) {
		this.rememberStoreChoice = value;
		if (browser) localStorage.setItem(this.scoped(REMEMBER_KEY), String(value));
	}

	logout() {
		this.user = null;
		this.token = null;
	}

	/** Restore the mock session (stands in for a real sign-in). */
	login() {
		this.user = MOCK_USER;
		this.token = 'mock-token';
	}

	private scoped(key: string) {
		return `${key}:${this.user?.username ?? 'anon'}`;
	}
}

export const auth = new AuthController();
