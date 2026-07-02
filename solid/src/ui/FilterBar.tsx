import { createSignal, For, Show, type JSX, createMemo } from 'solid-js';
import { Icon } from './Icon';
import { Popover } from './Popover';
import { Select } from './Select';

/*
 * Add-a-filter menu (tables.md#filtering): a "Filters" dropdown lists the filters
 * available but not yet applied; choosing one activates it as an inline typed
 * control next to the dropdown. Active filters drop out of the dropdown. Each filter
 * clears/disappears when cleared; "Remove all filters" clears every applied value.
 * State binding to the URL is the page's responsibility (this control is controlled).
 */

export interface FilterDef {
  key: string;
  label: string;
  type: 'enum' | 'text';
  options?: { value: string; label: string }[];
}

export interface FilterBarProps {
  defs: FilterDef[];
  values: Record<string, string | undefined>;
  onChange: (key: string, value: string | undefined) => void;
  children?: JSX.Element; // trailing toolbar actions
}

export function FilterBar(props: FilterBarProps): JSX.Element {
  const [menuOpen, setMenuOpen] = createSignal(false);
  // Filters manually activated this session (in addition to those with a URL value).
  const [activated, setActivated] = createSignal<string[]>([]);
  let menuBtn: HTMLButtonElement | undefined;

  const activeKeys = createMemo(() => {
    const keys = new Set(activated());
    for (const d of props.defs) if (props.values[d.key] != null) keys.add(d.key);
    return props.defs.filter((d) => keys.has(d.key));
  });
  const availableDefs = () => props.defs.filter((d) => !activeKeys().some((a) => a.key === d.key));

  const activate = (key: string) => {
    setActivated((a) => (a.includes(key) ? a : [...a, key]));
    setMenuOpen(false);
  };
  const deactivate = (key: string) => {
    setActivated((a) => a.filter((k) => k !== key));
    props.onChange(key, undefined);
  };
  const removeAll = () => {
    for (const d of props.defs) props.onChange(d.key, undefined);
    setActivated([]);
    setMenuOpen(false);
  };

  return (
    <div class="filter-bar">
      <button
        ref={menuBtn}
        type="button"
        class="btn btn-secondary btn-compact"
        aria-haspopup="menu"
        aria-expanded={menuOpen()}
        onClick={() => setMenuOpen((v) => !v)}
      >
        <Icon name="filter" size={16} />
        <span class="btn-label">Filters</span>
      </button>
      <Popover open={menuOpen()} anchor={menuBtn} onClose={() => setMenuOpen(false)} role="menu">
        <Show when={availableDefs().length > 0} fallback={<div class="menu-empty">All filters applied</div>}>
          <For each={availableDefs()}>
            {(d) => (
              <button type="button" class="menu-item" role="menuitem" onClick={() => activate(d.key)}>
                <span class="menu-item-check" />
                <span>{d.label}</span>
              </button>
            )}
          </For>
        </Show>
        <Show when={activeKeys().length > 0}>
          <div class="menu-divider" />
          <button type="button" class="menu-item" role="menuitem" onClick={removeAll}>
            <span class="menu-item-check"><Icon name="minus-circle" size={16} /></span>
            <span>Remove all filters</span>
          </button>
        </Show>
      </Popover>

      <For each={activeKeys()}>
        {(d) => (
          <div class="active-filter">
            <Show when={d.type === 'enum'}>
              <Select
                label={undefined}
                placeholder={d.label}
                options={d.options ?? []}
                value={props.values[d.key] ?? null}
                onChange={(v) => props.onChange(d.key, v ?? undefined)}
                containerClass="active-filter-control"
              />
            </Show>
            <Show when={d.type === 'text'}>
              <input
                class="input input-compact"
                placeholder={d.label}
                value={props.values[d.key] ?? ''}
                onInput={(e) => props.onChange(d.key, e.currentTarget.value || undefined)}
              />
            </Show>
            <button type="button" class="active-filter-remove" aria-label={`Remove ${d.label} filter`} onClick={() => deactivate(d.key)}>
              <Icon name="close" size={14} />
            </button>
          </div>
        )}
      </For>

      <div class="filter-bar-spacer" />
      {props.children}
    </div>
  );
}
