import { useMemo, useRef, useState, type RefObject } from 'react';
import { Icon } from '@/icons/Icon';
import { Popover } from '@/components/Popover';
import { Toggle } from '@/components/Toggle';
import { useAuth } from '@/app/auth/AuthContext';
import './selectors.css';

/**
 * Store selector (spec/chrome/01-behaviours.md#store-selector):
 *  - click popover; hidden entirely if the user has fewer than 2 stores
 *  - lists stores sorted by name and searchable by name
 *  - current + disabled/on-hold stores are not selectable (on-hold labelled)
 *  - selecting sets active, closes, and navigates to the root landing path
 *  - "remember choice" per-user preference to skip the selector at login
 */
interface StoreSelectorProps {
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  onPick: (id: string) => void;
}

export function StoreSelector({ anchorRef, open, onClose, onPick }: StoreSelectorProps) {
  const { store, stores, rememberStore, setRememberStore } = useAuth();
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stores.filter((s) => !q || s.storeName.toLowerCase().includes(q));
  }, [stores, query]);

  return (
    <Popover
      anchorRef={anchorRef}
      open={open}
      onClose={onClose}
      placement="top-start"
      role="dialog"
      className="oms-selector"
    >
      <div className="oms-selector__search">
        <Icon name="search" size={16} />
        <input
          ref={searchRef}
          type="text"
          autoFocus
          placeholder="Search stores…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search stores"
        />
      </div>
      <ul className="oms-selector__list" role="listbox" aria-label="Stores">
        {filtered.length === 0 ? (
          <li className="oms-menu-empty">No matching stores</li>
        ) : (
          filtered.map((s) => {
            const isCurrent = s.id === store?.id;
            const unavailable = s.isDisabled || s.onHold;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isCurrent}
                  disabled={isCurrent || unavailable}
                  className={`oms-menu-item${isCurrent ? ' is-active' : ''}`}
                  onClick={() => onPick(s.id)}
                >
                  <Icon name="home" size={16} />
                  <span className="oms-selector__store-name">{s.storeName}</span>
                  {s.onHold && <span className="oms-selector__tag">On hold</span>}
                  {isCurrent && <Icon name="check" size={16} className="oms-menu-item__check" />}
                </button>
              </li>
            );
          })
        )}
      </ul>
      <div className="oms-selector__footer">
        <Toggle
          checked={rememberStore}
          onChange={setRememberStore}
          label="Remember choice"
        />
      </div>
    </Popover>
  );
}
