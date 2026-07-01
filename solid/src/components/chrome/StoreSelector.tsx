import { createMemo, createSignal, For, onCleanup, Show, type JSX } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { useStore } from '../../context/StoreContext';
import { Icon } from '../ui/Icon';

// Store control + click-popover selector (chrome/01-behaviours.md#store-selector):
// sorted by name, searchable, current store not selectable, switch navigates to root.
export function StoreSelector(): JSX.Element {
  const store = useStore();
  const navigate = useNavigate();
  const [open, setOpen] = createSignal(false);
  const [query, setQuery] = createSignal('');
  let ref: HTMLDivElement | undefined;

  const sorted = createMemo(() =>
    [...store.stores()].sort((a, b) => a.storeName.localeCompare(b.storeName)),
  );
  const filtered = createMemo(() => {
    const q = query().toLowerCase().trim();
    return q ? sorted().filter((s) => s.storeName.toLowerCase().includes(q)) : sorted();
  });

  const onDoc = (e: MouseEvent) => {
    if (ref && !ref.contains(e.target as Node)) setOpen(false);
  };
  const toggle = () => {
    const next = !open();
    setOpen(next);
    if (next) document.addEventListener('mousedown', onDoc);
    else document.removeEventListener('mousedown', onDoc);
  };
  onCleanup(() => document.removeEventListener('mousedown', onDoc));

  const pick = (id: string) => {
    if (id === store.storeId()) return;
    store.setStoreId(id);
    setOpen(false);
    setQuery('');
    // Land on a valid place for the new store, not a stale deep link.
    navigate('/stocktakes');
  };

  return (
    <div class="popover-anchor" ref={ref}>
      <button class="footer__control" onClick={toggle} aria-haspopup="true" aria-expanded={open()}>
        <Icon name="home" size={18} />
        <span class="truncate" style={{ 'max-width': '160px' }}>
          {store.activeStore()?.storeName ?? 'Select store'}
        </span>
        <Icon name="chevron-down" size={14} />
      </button>
      <Show when={open()}>
        <div class="popover" role="listbox" aria-label="Select store">
          <div class="select-search" style={{ padding: 'var(--sp-1)' }}>
            <input
              class="input input--sm"
              placeholder="Search stores…"
              value={query()}
              // eslint-disable-next-line
              ref={(el) => queueMicrotask(() => el.focus())}
              onInput={(e) => setQuery(e.currentTarget.value)}
            />
          </div>
          <For each={filtered()}>
            {(s) => (
              <div
                class="select-option"
                role="option"
                aria-selected={s.id === store.storeId()}
                data-selected={s.id === store.storeId()}
                data-disabled={s.id === store.storeId()}
                onClick={() => pick(s.id)}
              >
                <span class="truncate">{s.storeName}</span>
                <Show when={s.id === store.storeId()}>
                  <Icon name="check" size={16} />
                </Show>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
