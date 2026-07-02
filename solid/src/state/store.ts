import { createSignal, createResource, createRoot } from 'solid-js';
import { request } from '../lib/graphql';

/*
 * Active-store state. The URL is the source of truth for which store is active
 * (urls.md#store-in-the-url) — the route layout syncs activeStoreId from the
 * leading path segment. This module owns the list of the user's stores (for the
 * selector) and the per-user "remember choice" preference.
 */

export interface Store {
  id: string;
  code: string;
  storeName: string;
  isDisabled: boolean;
  isOnHold: boolean;
}

// StoreNode.name requires a storeId argument, so on-hold isn't fetched per store
// here; isDisabled gates selectability. (On-hold labelling is a known gap.)
const STORES_QUERY = `
  query Stores {
    stores(page: { first: 500 }) {
      ... on StoreConnector {
        totalCount
        nodes { id code storeName isDisabled }
      }
    }
  }
`;

interface StoresData {
  stores: {
    nodes: {
      id: string;
      code: string;
      storeName: string;
      isDisabled: boolean;
    }[];
  };
}

async function fetchStores(): Promise<Store[]> {
  const data = await request<StoresData>(STORES_QUERY);
  return data.stores.nodes
    .map((n) => ({
      id: n.id,
      code: n.code,
      storeName: n.storeName,
      isDisabled: n.isDisabled,
      isOnHold: false,
    }))
    .sort((a, b) => a.storeName.localeCompare(b.storeName));
}

const state = createRoot(() => {
  const [stores] = createResource(fetchStores, { initialValue: [] });
  const [activeStoreId, setActiveStoreId] = createSignal<string | undefined>();
  return { stores, activeStoreId, setActiveStoreId };
});

export const stores = state.stores;
export const activeStoreId = state.activeStoreId;
export const setActiveStoreId = state.setActiveStoreId;

export function activeStore(): Store | undefined {
  const id = activeStoreId();
  return state.stores().find((s) => s.id === id);
}

/** First store the user can actually land in (not disabled). */
export function defaultStoreId(): string | undefined {
  const list = state.stores();
  return (list.find((s) => !s.isDisabled) ?? list[0])?.id;
}

/* "Remember choice" — per-user preference to skip the store selector at login. */
export function rememberStorePref(username: string): boolean {
  return localStorage.getItem(`oms.rememberStore.${username}`) === '1';
}
export function setRememberStorePref(username: string, remember: boolean): void {
  localStorage.setItem(`oms.rememberStore.${username}`, remember ? '1' : '0');
}
