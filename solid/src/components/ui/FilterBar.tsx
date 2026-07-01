import { createMemo, createSignal, For, onCleanup, Show, createEffect, type JSX } from 'solid-js';
import { useSearchParams } from '@solidjs/router';
import { Icon } from './Icon';
import { Select } from './Select';

// Add-a-filter menu (spec/ui-standards/tables.md#filtering): a "Filters" dropdown
// of not-yet-applied filters; choosing one activates it as an inline typed control.
// State lives in the URL so the filtered view is shareable and survives reload.

export interface FilterDef {
  key: string; // URL query-param name
  label: string;
  type: 'enum'; // (text/date/number/boolean to follow as verticals need them)
  options?: { value: string; label: string }[];
  default?: boolean; // always-on; not individually removable
}

export function FilterBar(props: { filters: FilterDef[] }): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const [menuOpen, setMenuOpen] = createSignal(false);
  // Filters the user has surfaced but not yet given a value.
  const [activated, setActivated] = createSignal<Set<string>>(new Set());
  let ref: HTMLDivElement | undefined;

  // Anything with a value in the URL, a default, or explicitly activated is "active".
  const isActive = (f: FilterDef) =>
    f.default || activated().has(f.key) || searchParams[f.key] != null;

  const activeFilters = createMemo(() => props.filters.filter(isActive));
  const inactiveFilters = createMemo(() => props.filters.filter((f) => !isActive(f)));

  const valueOf = (key: string) => {
    const v = searchParams[key];
    return Array.isArray(v) ? v[0] : (v ?? null);
  };

  const setValue = (key: string, value: string | null) => {
    setSearchParams({ [key]: value || undefined });
  };

  const activate = (f: FilterDef) => {
    setActivated((prev) => new Set<string>(prev).add(f.key));
    setMenuOpen(false);
  };

  const removeFilter = (f: FilterDef) => {
    setActivated((prev) => {
      const next = new Set<string>(prev);
      next.delete(f.key);
      return next;
    });
    setValue(f.key, null);
  };

  const removeAll = () => {
    // Clear every applied value; defaults stay applied but reset.
    const cleared: Record<string, undefined> = {};
    for (const f of props.filters) cleared[f.key] = undefined;
    setSearchParams(cleared);
    setActivated(new Set<string>());
    setMenuOpen(false);
  };

  const onDoc = (e: MouseEvent) => {
    if (ref && !ref.contains(e.target as Node)) setMenuOpen(false);
  };
  createEffect(() => {
    if (menuOpen()) document.addEventListener('mousedown', onDoc);
    else document.removeEventListener('mousedown', onDoc);
  });
  onCleanup(() => document.removeEventListener('mousedown', onDoc));

  const hasApplied = () => props.filters.some((f) => searchParams[f.key] != null);

  return (
    <div class="filterbar" ref={ref}>
      {/* Active filters as typed controls */}
      <For each={activeFilters()}>
        {(f) => (
          <div class="filter-chip">
            <span class="filter-chip__label">{f.label}</span>
            <Show when={f.type === 'enum'}>
              <Select
                size="sm"
                value={valueOf(f.key)}
                options={f.options ?? []}
                onChange={(v) => setValue(f.key, v)}
                placeholder="Any"
                aria-label={f.label}
              />
            </Show>
            <Show when={!f.default}>
              <button class="filter-chip__remove" aria-label={`Remove ${f.label} filter`} onClick={() => removeFilter(f)}>
                <Icon name="close" size={14} />
              </button>
            </Show>
          </div>
        )}
      </For>

      {/* Add-a-filter dropdown */}
      <div class="popover-anchor">
        <button class="btn btn--secondary btn--sm" aria-haspopup="menu" aria-expanded={menuOpen()} onClick={() => setMenuOpen((o) => !o)}>
          <Icon name="filter" size={16} /> Filters
        </button>
        <Show when={menuOpen()}>
          <div class="filter-menu" role="menu">
            <Show when={inactiveFilters().length > 0} fallback={<div class="select-option muted">All filters added</div>}>
              <For each={inactiveFilters()}>
                {(f) => (
                  <div class="select-option" role="menuitem" onClick={() => activate(f)}>
                    <span>{f.label}</span>
                    <Icon name="plus" size={14} />
                  </div>
                )}
              </For>
            </Show>
            <Show when={hasApplied()}>
              <div class="filter-menu__sep" />
              <div class="select-option" role="menuitem" onClick={removeAll}>
                <span>Remove all filters</span>
                <Icon name="delete" size={14} />
              </div>
            </Show>
          </div>
        </Show>
      </div>
    </div>
  );
}
