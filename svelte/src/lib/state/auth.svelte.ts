// Auth context consumed by the chrome (spec chrome/00-overview.md). Login itself is
// out of scope here, so the user is mocked (a signed-in session); the store list is
// LIVE from the dev server. In dev the `me` query needs a real session cookie that raw
// requests lack, so we read the store list from the global `stores` query (works no-auth)
// and treat isDisabled as the selectability gate. StoreNode exposes no brand colour
// (only a logo), so the bottom bar falls back to the nav surface.

import { gql } from '../graphql';

export type Store = {
  id: string;
  code: string;
  name: string;
  isDisabled: boolean;
  logo: string | null;
};

export type User = {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
};

const STORES_QUERY = `
  query {
    stores(page: { first: 200 }) {
      ... on StoreConnector {
        totalCount
        nodes { id code storeName isDisabled logo }
      }
    }
  }
`;

const ACTIVE_KEY = 'oms.activeStore';
const REMEMBER_KEY = 'oms.rememberStore';

class AuthState {
  user = $state<User>({
    username: 'admin',
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@msupply.foundation',
    jobTitle: 'Store Manager',
  });
  token = $state<string | null>('dev-session');
  stores = $state<Store[]>([]);
  activeStoreId = $state<string | null>(localStorage.getItem(ACTIVE_KEY));
  loaded = $state(false);

  get signedIn(): boolean {
    return this.token !== null;
  }

  get activeStore(): Store | null {
    return this.stores.find((s) => s.id === this.activeStoreId) ?? null;
  }

  /** Stores the user can switch to (excludes disabled + the current one). */
  get selectableStores(): Store[] {
    return this.stores.filter((s) => !s.isDisabled);
  }

  async load() {
    const data = await gql<{ stores: { nodes: any[] } }>(STORES_QUERY);
    this.stores = data.stores.nodes.map((n) => ({
      id: n.id,
      code: n.code,
      name: n.storeName ?? n.code,
      isDisabled: n.isDisabled,
      logo: n.logo ?? null,
    }));
    // Default active store: persisted choice if still valid, else first enabled.
    if (!this.activeStore) {
      const first = this.stores.find((s) => !s.isDisabled) ?? this.stores[0];
      this.activeStoreId = first?.id ?? null;
    }
    this.loaded = true;
  }

  setActiveStore(id: string) {
    if (id === this.activeStoreId) return;
    this.activeStoreId = id;
    localStorage.setItem(ACTIVE_KEY, id);
  }

  get rememberStore(): boolean {
    return localStorage.getItem(REMEMBER_KEY) === 'true';
  }
  setRememberStore(v: boolean) {
    localStorage.setItem(REMEMBER_KEY, String(v));
  }

  logout() {
    this.token = null;
  }
}

export const auth = new AuthState();
