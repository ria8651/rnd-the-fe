import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { gqlRequest } from '@/lib/graphql';

/**
 * Auth context. Chrome only CONSUMES auth state (login is out of scope — see
 * spec/chrome/00-overview.md). The dev server's `me` needs a real session, so we
 * seed a dev user and hydrate the store list from the live `stores` query. The
 * store selector, active-store persistence, and "remember choice" all behave per
 * spec/chrome/01-behaviours.md.
 */

export interface Store {
  id: string;
  code: string;
  storeName: string;
  isDisabled: boolean;
  /**
   * On-hold stores are listed but not selectable, and labelled "On hold"
   * (spec AC-CH7). The dev StoreNode schema exposes no on-hold field (only
   * `isDisabled`), so this stays undefined here — the selector logic is wired
   * and ready for when a deployment surfaces it, like the store-colour stand-in.
   */
  onHold?: boolean;
}

export interface AppUser {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
}

interface AuthContextValue {
  user: AppUser;
  store: Store | null;
  stores: Store[];
  setActiveStore: (id: string) => void;
  rememberStore: boolean;
  setRememberStore: (v: boolean) => void;
  logout: () => void;
  hasPermission: (perm: string) => boolean;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const DEV_USER: AppUser = {
  username: 'admin',
  firstName: 'Alex',
  lastName: 'Kumar',
  email: 'admin@msupply.foundation',
  jobTitle: 'Store Manager',
};

const ACTIVE_STORE_KEY = 'oms.activeStoreId';
const rememberKey = (username: string) => `oms.rememberStore.${username}`;

const STORES_QUERY = /* GraphQL */ `
  query Stores {
    stores(page: { first: 200 }) {
      ... on StoreConnector {
        totalCount
        nodes {
          id
          code
          storeName
          isDisabled
        }
      }
    }
  }
`;

interface StoresData {
  stores: { totalCount: number; nodes: Store[] };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['stores'],
    queryFn: () => gqlRequest<StoresData>(STORES_QUERY),
    staleTime: 5 * 60_000,
  });

  const stores = useMemo(
    () =>
      (data?.stores.nodes ?? [])
        .filter((s) => !!s.storeName)
        .sort((a, b) => a.storeName.localeCompare(b.storeName)),
    [data],
  );

  const [activeStoreId, setActiveStoreId] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_STORE_KEY),
  );
  const [rememberStore, setRememberStoreState] = useState<boolean>(
    () => localStorage.getItem(rememberKey(DEV_USER.username)) === 'true',
  );

  // Default the active store once the list arrives.
  useEffect(() => {
    if (stores.length === 0) return;
    const exists = stores.some((s) => s.id === activeStoreId && !s.isDisabled);
    if (!exists) {
      const first = stores.find((s) => !s.isDisabled) ?? stores[0];
      setActiveStoreId(first.id);
      localStorage.setItem(ACTIVE_STORE_KEY, first.id);
    }
  }, [stores, activeStoreId]);

  const setActiveStore = useCallback((id: string) => {
    setActiveStoreId(id);
    localStorage.setItem(ACTIVE_STORE_KEY, id);
  }, []);

  const setRememberStore = useCallback((v: boolean) => {
    setRememberStoreState(v);
    localStorage.setItem(rememberKey(DEV_USER.username), String(v));
  }, []);

  const logout = useCallback(() => {
    // Chrome routes to Login on logout; there is no real session to clear in dev.
    localStorage.removeItem(ACTIVE_STORE_KEY);
    window.location.assign('/login');
  }, []);

  const store = stores.find((s) => s.id === activeStoreId) ?? null;

  const value = useMemo<AuthContextValue>(
    () => ({
      user: DEV_USER,
      store,
      stores,
      setActiveStore,
      rememberStore,
      setRememberStore,
      logout,
      hasPermission: () => true, // dev: all permissions granted
      loading: isLoading,
      error: error ? (error as Error).message : null,
    }),
    [store, stores, setActiveStore, rememberStore, setRememberStore, logout, isLoading, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/** The active store id, for store-scoped GraphQL operations. */
export function useStoreId(): string | null {
  return useAuth().store?.id ?? null;
}
