// Auth context. Login is out of scope (chrome only consumes auth state), and
// the dev endpoint needs no auth, so the user is a fixed profile while stores
// come from the live API. Store brand colour isn't in the API, so we derive a
// stable colour per store id (its purpose is at-a-glance store identity).
import { signal, computed } from '../core/signal';
import { fetchStores } from '../api/reference';
import type { StoreRef } from '../api/types';

export interface AppUser {
  username: string;
  email: string;
  jobTitle: string;
}

export const user: AppUser = {
  username: 'admin',
  email: 'admin@msupply.foundation',
  jobTitle: 'Store Manager',
};

const [storesGet, storesSet] = signal<StoreRef[]>([]);
export const stores = storesGet;

const [storeIdGet, storeIdSet] = signal<string | null>(null);
export const currentStoreId = storeIdGet;

export const currentStore = computed<StoreRef | null>(() => {
  const id = storeIdGet();
  return stores().find((s) => s.id === id) ?? null;
});

export function setCurrentStoreId(id: string) {
  storeIdSet(id);
  localStorage.setItem('oms.storeId', id);
}

const STORE_COLOURS = ['#2F6F4F', '#3E5C9A', '#8A3E7A', '#B5651D', '#3C6E71', '#6A4C93', '#9A3B3B', '#4A6D2C'];

export function storeColour(store: StoreRef | null): string | null {
  if (!store) return null;
  let hash = 0;
  for (const c of store.id) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return STORE_COLOURS[hash % STORE_COLOURS.length];
}

export function hasPermission(_permission: string): boolean {
  return true;
}

/** Load stores and pick the active one (URL segment > persisted > first). */
export async function initAuth(preferredStoreId?: string | null): Promise<void> {
  const list = await fetchStores();
  list.sort((a, b) => a.storeName.localeCompare(b.storeName));
  storesSet(list);
  const persisted = localStorage.getItem('oms.storeId');
  const pick =
    (preferredStoreId && list.find((s) => s.id === preferredStoreId)?.id) ||
    (persisted && list.find((s) => s.id === persisted)?.id) ||
    list[0]?.id ||
    null;
  storeIdSet(pick);
  if (pick) localStorage.setItem('oms.storeId', pick);
}
