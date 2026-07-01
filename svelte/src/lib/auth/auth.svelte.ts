/**
 * Auth context the chrome consumes (chrome/00-overview.md › Key dependencies).
 *
 * MOCK for Stage 3 — a stand-in for the real session so the shell is demonstrable
 * before login + live GraphQL land (Stage 4). It exposes exactly what the chrome
 * needs: the current user, the active store, the user's stores, a token, and a
 * permission check. The shape is what the real adapter will populate.
 */
import { browser } from '$app/environment';
import { gql } from '$lib/api/graphql';

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

// The data-rich test store (402 stocktakes) — a good default landing for the demo.
const DEFAULT_STORE_ID = 'AFCA0C9F0743AB43B779FB9EA2E64EAF';

// Seed with two known real stores so the selector isn't empty before the live
// `stores` query resolves; loadStores() then replaces this with the full list.
const SEED_STORES: Store[] = [
	{ id: DEFAULT_STORE_ID, name: 'Liquica Store', code: 'liquica' },
	{ id: '5B28901C52396E4BB098B9862CCF5DF9', name: 'CHC Ermera', code: 'chc_ermera' }
];

const STORE_KEY = 'oms.activeStore';
const REMEMBER_KEY = 'oms.rememberStore';

class AuthController {
	user = $state<User | null>(MOCK_USER);
	stores = $state<Store[]>(SEED_STORES);
	storeId = $state<string>(DEFAULT_STORE_ID);
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
		if (storedStore) this.storeId = storedStore;
		this.rememberStoreChoice = localStorage.getItem(this.scoped(REMEMBER_KEY)) === 'true';
		void this.loadStores();
	}

	/** Load the real store list from the live API (user is still mocked). */
	async loadStores() {
		try {
			const data = await gql<{ stores: { nodes: { id: string; code: string; storeName: string }[] } }>(
				`query { stores(page: { first: 200 }) { ... on StoreConnector { nodes { id code storeName } } } }`
			);
			if (data.stores?.nodes?.length) {
				this.stores = data.stores.nodes.map((s) => ({ id: s.id, name: s.storeName, code: s.code }));
				// Drop a stale/invalid persisted store id (e.g. from earlier mock data).
				if (!this.stores.some((s) => s.id === this.storeId)) this.storeId = DEFAULT_STORE_ID;
			}
		} catch {
			// Keep the seed stores if the API is unreachable.
		}
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
