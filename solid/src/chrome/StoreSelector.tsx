import { For, Show, createSignal, createMemo, type JSX } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Icon } from '../ui/Icon';
import { Popover } from '../ui/Popover';
import { Checkbox } from '../ui/Checkbox';
import { stores, activeStore, activeStoreId, setActiveStoreId } from '../state/store';
import { currentUser } from '../state/auth';
import { rememberStorePref, setRememberStorePref } from '../state/store';

/*
 * Store selector (chrome/01-behaviours.md#store-selector). Hidden if the user has
 * fewer than 2 stores. Lists stores sorted by name and searchable; the current and
 * any disabled/on-hold stores are not selectable (on-hold ones labelled). Selecting
 * sets the active store and navigates to the root landing path (not a stale deep
 * link). "Remember choice" persists per-user.
 */

export function StoreSelector(): JSX.Element {
  const [open, setOpen] = createSignal(false);
  const [search, setSearch] = createSignal('');
  const navigate = useNavigate();
  let trigger: HTMLButtonElement | undefined;

  const filtered = createMemo(() => {
    const q = search().trim().toLowerCase();
    return stores().filter((s) => !q || s.storeName.toLowerCase().includes(q));
  });

  const choose = (id: string) => {
    setActiveStoreId(id);
    setOpen(false);
    // Land on the area root for the new store (store-in-URL landing rule).
    navigate(`/${id}/dashboard`);
  };

  return (
    <Show when={stores().length >= 2}>
      <button
        ref={trigger}
        type="button"
        class="bottombar-item"
        aria-haspopup="dialog"
        aria-expanded={open()}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="home" size={16} />
        <span class="bottombar-label">{activeStore()?.storeName ?? 'Store'}</span>
      </button>
      <Popover open={open()} anchor={trigger} onClose={() => setOpen(false)} role="dialog" class="selector-popover">
        <div class="selector-search">
          <Icon name="search" size={16} />
          <input
            class="input input-compact"
            placeholder="Search stores"
            value={search()}
            onInput={(e) => setSearch(e.currentTarget.value)}
          />
        </div>
        <ul class="selector-list">
          <For each={filtered()}>
            {(s) => {
              const disabled = () => s.id === activeStoreId() || s.isDisabled || s.isOnHold;
              return (
                <li>
                  <button
                    type="button"
                    class={`selector-option${s.id === activeStoreId() ? ' selector-option-current' : ''}`}
                    disabled={disabled()}
                    onClick={() => choose(s.id)}
                  >
                    <span>{s.storeName}</span>
                    <Show when={s.isOnHold}>
                      <span class="selector-tag">on hold</span>
                    </Show>
                    <Show when={s.id === activeStoreId()}>
                      <Icon name="check" size={16} />
                    </Show>
                  </button>
                </li>
              );
            }}
          </For>
        </ul>
        <Show when={currentUser()}>
          <label class="selector-remember">
            <Checkbox
              aria-label="Remember this store choice"
              checked={rememberStorePref(currentUser()!.username)}
              onChange={(c) => setRememberStorePref(currentUser()!.username, c)}
            />
            <span>Remember my choice</span>
          </label>
        </Show>
      </Popover>
    </Show>
  );
}
