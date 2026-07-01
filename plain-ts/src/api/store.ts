// Active-store context. Stocktakes are store-scoped, so every screen reads the
// active store from here. The store list comes from the current user's stores
// (chrome spec: ../../spec/chrome/01-behaviours.md#store-selector).

import { gql, setRequestStoreId } from './client.ts';
import { signal } from '../framework/signal.ts';

export interface Store {
  id: string;
  code: string;
  name: string;
}

const STORAGE_KEY = 'oms.active-store';

export const stores = signal<Store[]>([]);
export const activeStore = signal<Store | null>(null);

export function setActiveStore(store: Store): void {
  activeStore.set(store);
  setRequestStoreId(store.id);
  localStorage.setItem(STORAGE_KEY, store.id);
}

// Ideally this reads the *current user's* stores via `me { stores }` (chrome
// spec). But `me` requires an authenticated session, and login is out of scope
// here (the chrome consumes auth, it does not perform it — see
// ../../spec/chrome/01-behaviours.md#cross-cutting). The dev server exposes the
// global `stores` query anonymously, so we list all enabled stores and let the
// user pick. NOTE: this is a dev-only substitute for user-scoped stores.
const STORES_QUERY = `
  query Stores {
    stores {
      ... on StoreConnector {
        nodes { id code storeName }
      }
    }
  }
`;

export async function loadStores(): Promise<void> {
  const data = await gql<{ stores: { nodes: Array<{ id: string; code: string; storeName: string }> } }>(
    STORES_QUERY,
  );
  const list: Store[] = data.stores.nodes
    .map((n) => ({ id: n.id, code: n.code, name: n.storeName }))
    .sort((a, b) => a.name.localeCompare(b.name));
  stores.set(list);

  const savedId = localStorage.getItem(STORAGE_KEY);
  const initial = list.find((s) => s.id === savedId) ?? list[0];
  if (initial) setActiveStore(initial);
}
