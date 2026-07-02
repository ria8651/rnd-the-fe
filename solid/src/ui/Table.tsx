import { For, Show, type JSX } from 'solid-js';
import { Icon } from './Icon';
import { Checkbox } from './Checkbox';
import { viewportWidth, isPhone } from '../state/viewport';

/*
 * Generic data table (tables.md). Implements: data-type alignment, sortable headers
 * with a brand direction indicator, row selection (+ select-all), column priority
 * (P3 hides ≤1100px, P2 ≤800px), a persistent header, the four presentation states
 * (normal / loading / empty / error, distinguishing no-records from no-matches), and
 * a card layout below 600px where every hidden column still appears as a card field.
 */

export type Align = 'left' | 'right' | 'center';

export interface Column<T> {
  key: string;
  header: string;
  align?: Align;
  /** Lower priority hides first; P1 (default) never hides. */
  priority?: 1 | 2 | 3;
  sortable?: boolean;
  width?: string;
  render: (row: T) => JSX.Element;
  /** Omit from the card body (e.g. identity already shown in the card header). */
  cardHidden?: boolean;
}

export type TableState = 'normal' | 'loading' | 'empty-no-records' | 'empty-no-matches' | 'error';

export interface Selection {
  isSelected: (id: string) => boolean;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  allSelected: boolean;
  someSelected: boolean;
}

export interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  selection?: Selection;
  sort?: { key: string; desc: boolean };
  onSort?: (key: string) => void;
  state?: TableState;
  errorMessage?: string;
  onRetry?: () => void;
  onClearFilters?: () => void;
  emptyMessage?: string;
  rowError?: (row: T) => boolean;
  density?: 'compact' | 'comfortable' | 'spacious';
  /** Card layout (phones) header content. */
  cardTitle?: (row: T) => JSX.Element;
  cardStatus?: (row: T) => JSX.Element;
  caption?: string;
}

export function Table<T>(props: TableProps<T>): JSX.Element {
  const visibleColumns = () =>
    props.columns.filter((c) => {
      const p = c.priority ?? 1;
      if (p === 3 && viewportWidth() < 1100) return false;
      if (p === 2 && viewportWidth() < 800) return false;
      return true;
    });

  const state = () => props.state ?? 'normal';
  const colSpan = () => visibleColumns().length + (props.selection ? 1 : 0);

  const StatusRow = (p: { children: JSX.Element }) => (
    <tr>
      <td class="table-status-cell" colSpan={colSpan()}>
        {p.children}
      </td>
    </tr>
  );

  return (
    <Show
      when={!isPhone()}
      fallback={<CardList {...(props as TableProps<T>)} />}
    >
      <table class={`data-table density-${props.density ?? 'comfortable'}`}>
        <Show when={props.caption}>
          <caption class="visually-hidden">{props.caption}</caption>
        </Show>
        <thead>
          <tr>
            <Show when={props.selection}>
              <th class="col-select">
                <Checkbox
                  aria-label="Select all"
                  checked={props.selection!.allSelected}
                  indeterminate={props.selection!.someSelected && !props.selection!.allSelected}
                  onChange={() => props.selection!.onToggleAll()}
                />
              </th>
            </Show>
            <For each={visibleColumns()}>
              {(col) => (
                <th
                  class={`align-${col.align ?? 'left'}${col.sortable ? ' sortable' : ''}`}
                  style={col.width ? { width: col.width } : undefined}
                  aria-sort={
                    props.sort?.key === col.key ? (props.sort.desc ? 'descending' : 'ascending') : undefined
                  }
                >
                  <Show when={col.sortable} fallback={col.header}>
                    <button type="button" class="th-sort" onClick={() => props.onSort?.(col.key)}>
                      <span>{col.header}</span>
                      <Show when={props.sort?.key === col.key}>
                        <Icon name={props.sort!.desc ? 'sort-desc' : 'sort-asc'} size={16} class="sort-ind" />
                      </Show>
                    </button>
                  </Show>
                </th>
              )}
            </For>
          </tr>
        </thead>
        <tbody>
          <Show when={state() === 'loading'}>
            <StatusRow>
              <div class="table-loading" role="status" aria-live="polite">
                Loading…
              </div>
            </StatusRow>
          </Show>
          <Show when={state() === 'error'}>
            <StatusRow>
              <div class="table-empty">
                <Icon name="circle-alert" size={24} />
                <p>{props.errorMessage ?? 'Something went wrong.'}</p>
                <Show when={props.onRetry}>
                  <button type="button" class="btn btn-secondary btn-compact" onClick={() => props.onRetry?.()}>
                    Retry
                  </button>
                </Show>
              </div>
            </StatusRow>
          </Show>
          <Show when={state() === 'empty-no-records'}>
            <StatusRow>
              <div class="table-empty">
                <p>{props.emptyMessage ?? 'No records yet.'}</p>
              </div>
            </StatusRow>
          </Show>
          <Show when={state() === 'empty-no-matches'}>
            <StatusRow>
              <div class="table-empty">
                <p>No matches for the current filter.</p>
                <Show when={props.onClearFilters}>
                  <button
                    type="button"
                    class="btn btn-ghost btn-compact"
                    onClick={() => props.onClearFilters?.()}
                  >
                    Clear filters
                  </button>
                </Show>
              </div>
            </StatusRow>
          </Show>
          <Show when={state() === 'normal'}>
            <For each={props.rows}>
              {(row) => {
                const id = props.rowKey(row);
                return (
                  <tr
                    class={`data-row${props.selection?.isSelected(id) ? ' row-selected' : ''}${
                      props.onRowClick ? ' row-clickable' : ''
                    }${props.rowError?.(row) ? ' row-error' : ''}`}
                    tabindex={props.onRowClick ? 0 : undefined}
                    onClick={() => props.onRowClick?.(row)}
                    onKeyDown={(e) => {
                      if (!props.onRowClick && !props.selection) return;
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        props.onRowClick?.(row);
                      } else if (e.key === ' ' && props.selection) {
                        e.preventDefault();
                        props.selection.onToggle(id);
                      }
                    }}
                  >
                    <Show when={props.selection}>
                      <td class="col-select" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          aria-label="Select row"
                          checked={props.selection!.isSelected(id)}
                          onChange={() => props.selection!.onToggle(id)}
                        />
                      </td>
                    </Show>
                    <For each={visibleColumns()}>
                      {(col) => <td class={`align-${col.align ?? 'left'}`}>{col.render(row)}</td>}
                    </For>
                  </tr>
                );
              }}
            </For>
          </Show>
        </tbody>
      </table>
    </Show>
  );
}

/* Card layout below 600px (tables.md#card-layout): all columns hidden from the
   table still appear as card fields. */
function CardList<T>(props: TableProps<T>): JSX.Element {
  const state = () => props.state ?? 'normal';
  return (
    <div class="card-list">
      <Show when={state() === 'loading'}>
        <div class="table-loading" role="status">Loading…</div>
      </Show>
      <Show when={state() === 'error'}>
        <div class="table-empty">
          <p>{props.errorMessage ?? 'Something went wrong.'}</p>
          <Show when={props.onRetry}>
            <button type="button" class="btn btn-secondary btn-compact" onClick={() => props.onRetry?.()}>Retry</button>
          </Show>
        </div>
      </Show>
      <Show when={state() === 'empty-no-records'}>
        <div class="table-empty"><p>{props.emptyMessage ?? 'No records yet.'}</p></div>
      </Show>
      <Show when={state() === 'empty-no-matches'}>
        <div class="table-empty">
          <p>No matches for the current filter.</p>
          <Show when={props.onClearFilters}>
            <button type="button" class="btn btn-ghost btn-compact" onClick={() => props.onClearFilters?.()}>Clear filters</button>
          </Show>
        </div>
      </Show>
      <Show when={state() === 'normal'}>
        <For each={props.rows}>
          {(row) => {
            const id = props.rowKey(row);
            return (
              <div
                class={`row-card${props.selection?.isSelected(id) ? ' row-selected' : ''}${props.rowError?.(row) ? ' row-error' : ''}`}
                onClick={() => props.onRowClick?.(row)}
              >
                <div class="row-card-head">
                  <Show when={props.selection}>
                    <span onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        aria-label="Select row"
                        checked={props.selection!.isSelected(id)}
                        onChange={() => props.selection!.onToggle(id)}
                      />
                    </span>
                  </Show>
                  <div class="row-card-title">{props.cardTitle ? props.cardTitle(row) : null}</div>
                  <div class="row-card-status">{props.cardStatus ? props.cardStatus(row) : null}</div>
                </div>
                <dl class="row-card-body">
                  <For each={props.columns.filter((c) => !c.cardHidden)}>
                    {(col) => (
                      <div class="row-card-field">
                        <dt>{col.header}</dt>
                        <dd class={`align-${col.align ?? 'left'}`}>{col.render(row)}</dd>
                      </div>
                    )}
                  </For>
                </dl>
              </div>
            );
          }}
        </For>
      </Show>
    </div>
  );
}
