import {
  createContext,
  createResource,
  createSignal,
  useContext,
  type ParentComponent,
} from 'solid-js';
import { fetchStores } from '../api/stocktakes';
import type { Store } from '../api/types';

// The active store. All stocktake operations are store-scoped. Auth is disabled
// in the dev server, so there is no login — we simply let the user pick a store
// (chrome › store selector) and persist the choice locally.

const STORAGE_KEY = 'oms.activeStoreId';

// Known-good default: CHC Ermera has editable NEW stocktakes.
const DEFAULT_STORE_ID = '5B28901C52396E4BB098B9862CCF5DF9';

interface StoreCtx {
  storeId: () => string;
  setStoreId: (id: string) => void;
  stores: () => Store[];
  activeStore: () => Store | undefined;
}

const Context = createContext<StoreCtx>();

export const StoreProvider: ParentComponent = (props) => {
  const [storeId, setStoreIdSignal] = createSignal(
    localStorage.getItem(STORAGE_KEY) ?? DEFAULT_STORE_ID,
  );
  const [stores] = createResource(async () => (await fetchStores()).nodes);

  const setStoreId = (id: string) => {
    setStoreIdSignal(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  const activeStore = () => stores()?.find((s) => s.id === storeId());

  return (
    <Context.Provider
      value={{
        storeId,
        setStoreId,
        stores: () => stores() ?? [],
        activeStore,
      }}
    >
      {props.children}
    </Context.Provider>
  );
};

export function useStore(): StoreCtx {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
