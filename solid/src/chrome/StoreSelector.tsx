/**
 * Store selector (spec/chrome/01-behaviours.md › Store selector). A click-popover from the
 * store control. Hidden entirely when the user has fewer than 2 stores. Lists stores sorted
 * by name and searchable; the current store and any disabled/on-hold stores are not
 * selectable (on-hold labelled). Selecting sets the active store and navigates to the root
 * landing path. A per-user "remember choice" preference skips the selector at next login.
 */
import { type JSX, For, Show, createMemo, createSignal } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Popover } from '../ui/Popover';
import { Icon } from '../ui/Icon';
import { Checkbox } from '../ui/inputs/Checkbox';
import { auth } from '../state/auth';
import { ROOT_PATH } from './nav-config';

export function StoreSelector(): JSX.Element {
  const [open, setOpen] = createSignal(false);
  const [query, setQuery] = createSignal('');
  const navigate = useNavigate();

  const sorted = createMemo(() => [...auth.stores].sort((a, b) => a.name.localeCompare(b.name)));
  const filtered = createMemo(() => {
    const q = query().trim().toLowerCase();
    return q ? sorted().filter((s) => s.name.toLowerCase().includes(q)) : sorted();
  });

  const choose = (id: string) => {
    const store = auth.stores.find((s) => s.id === id);
    if (!store || store.id === auth.storeId || store.isDisabled || store.isOnHold) return;
    auth.setStore(id);
    setOpen(false);
    setQuery('');
    navigate(ROOT_PATH); // land in a valid place for the new store (AC-CH8)
  };

  // Hidden entirely when there is nothing to switch to (AC-CH5).
  return (
    <Show when={auth.stores.length >= 2} fallback={
      <span class="bottom-bar__item"><Icon name="home" size={14} /><span>{auth.currentStore?.name ?? 'Store'}</span></span>
    }>
      <Popover
        open={open()}
        onClose={() => setOpen(false)}
        placement="top-start"
        trigger={
          <button
            class="bottom-bar__item"
            type="button"
            data-popover-trigger
            aria-haspopup="listbox"
            aria-expanded={open()}
            onClick={() => setOpen(!open())}
          >
            <Icon name="home" size={14} />
            <span>{auth.currentStore?.name ?? 'Select store'}</span>
          </button>
        }
      >
        <div class="selector-popover">
          <div class="select-search">
            <input
              class="control control--compact"
              type="text"
              placeholder="Search stores…"
              value={query()}
              onInput={(e) => setQuery(e.currentTarget.value)}
            />
          </div>
          <ul class="menu" role="listbox" aria-label="Stores">
            <For each={filtered()}>
              {(s) => {
                const isCurrent = () => s.id === auth.storeId;
                const blocked = () => s.isDisabled || s.isOnHold;
                return (
                  <li role="none">
                    <button
                      type="button"
                      role="option"
                      aria-selected={isCurrent()}
                      class={`menu-item${isCurrent() ? ' menu-item--selected' : ''}`}
                      disabled={isCurrent() || blocked()}
                      onClick={() => choose(s.id)}
                    >
                      <span class="menu-check">
                        <Show when={isCurrent()}>
                          <Icon name="check" size={16} />
                        </Show>
                      </span>
                      <span class="menu-item__label">{s.name}</span>
                      <Show when={s.isOnHold}>
                        <span class="store-tag">On hold</span>
                      </Show>
                    </button>
                  </li>
                );
              }}
            </For>
          </ul>
          <label class="menu-item" style={{ cursor: 'pointer' }}>
            <Checkbox
              checked={auth.rememberStoreChoice}
              ariaLabel="Remember this store at login"
              onChange={(v) => auth.setRememberStoreChoice(v)}
            />
            <span class="menu-item__label">Remember choice</span>
          </label>
        </div>
      </Popover>
    </Show>
  );
}
