/**
 * Auth context the chrome consumes (spec/chrome/00-overview.md › Key dependencies).
 *
 * The user is MOCKED — the login flow is out of scope for the chrome spec (it only
 * *consumes* auth state). The store list is loaded live from the API (auth is off in dev),
 * so the store selector works against real data. The shape here is exactly what a real
 * session adapter would populate: current user, active store, the user's stores, a token,
 * and a permission check.
 */
import { createSignal } from 'solid-js';
import { gql } from '../api/graphql';

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
  /** Store's configured colour for the bottom-bar strip (AC-CH17). The API exposes none yet,
   *  so this is unset and the bar falls back to the nav surface. */
  color?: string;
}

export type Permission = 'ServerAdmin' | 'StoreAccess' | 'EditStore';

const MOCK_USER: User = {
  username: 'mosadmin',
  email: 'admin@msupply.foundation',
  firstName: 'Mary',
  lastName: 'Osman',
  jobTitle: 'Store manager'
};

// The data-rich test store (see dev-graphql-server memory) — a good default landing.
const DEFAULT_STORE_ID = 'AFCA0C9F0743AB43B779FB9EA2E64EAF';
const SEED_STORES: Store[] = [
  { id: DEFAULT_STORE_ID, name: 'Liquica Store', code: 'liquica' },
  { id: '5B28901C52396E4BB098B9862CCF5DF9', name: 'CHC Ermera', code: 'chc_ermera' }
];

const STORE_KEY = 'oms.activeStore';
const REMEMBER_KEY = 'oms.rememberStore';
const ls = () => (typeof localStorage === 'undefined' ? null : localStorage);

const [user, setUser] = createSignal<User | null>(MOCK_USER);
const [stores, setStores] = createSignal<Store[]>(SEED_STORES);
const [storeId, setStoreId] = createSignal<string>(DEFAULT_STORE_ID);
const [token, setToken] = createSignal<string | null>('mock-token');
const [rememberStoreChoice, setRemember] = createSignal(false);

const scoped = (key: string) => `${key}:${user()?.username ?? 'anon'}`;

export const auth = {
  get user() {
    return user();
  },
  get stores() {
    return stores();
  },
  get storeId() {
    return storeId();
  },
  get token() {
    return token();
  },
  get rememberStoreChoice() {
    return rememberStoreChoice();
  },
  get isAuthenticated() {
    return !!user() && !!token();
  },
  get currentStore(): Store | undefined {
    return stores().find((s) => s.id === storeId());
  },

  /** Permission gate. The mock grants everything except server-admin. */
  can(permission: Permission): boolean {
    return permission !== 'ServerAdmin';
  },

  init() {
    if (!user()) return;
    const storedStore = ls()?.getItem(scoped(STORE_KEY));
    if (storedStore) setStoreId(storedStore);
    setRemember(ls()?.getItem(scoped(REMEMBER_KEY)) === 'true');
    void this.loadStores();
  },

  /** Load the real store list from the live API (the user is still mocked). */
  async loadStores() {
    try {
      const data = await gql<{ stores: { nodes: { id: string; code: string; storeName: string; isDisabled: boolean }[] } }>(
        `query { stores(page: { first: 500 }) { ... on StoreConnector { nodes { id code storeName isDisabled } } } }`
      );
      if (data.stores?.nodes?.length) {
        setStores(data.stores.nodes.map((s) => ({ id: s.id, name: s.storeName, code: s.code, isDisabled: s.isDisabled })));
        // Drop a stale/invalid persisted store id.
        if (!stores().some((s) => s.id === storeId())) setStoreId(DEFAULT_STORE_ID);
      }
    } catch {
      // Keep the seed stores if the API is unreachable.
    }
  },

  setStore(id: string) {
    const store = stores().find((s) => s.id === id);
    if (!store || store.isDisabled || store.isOnHold) return;
    setStoreId(id);
    ls()?.setItem(scoped(STORE_KEY), id);
  },

  setRememberStoreChoice(value: boolean) {
    setRemember(value);
    ls()?.setItem(scoped(REMEMBER_KEY), String(value));
  },

  logout() {
    setUser(null);
    setToken(null);
  },

  /** Restore the mock session (stands in for a real sign-in). */
  login() {
    setUser(MOCK_USER);
    setToken('mock-token');
  }
};
