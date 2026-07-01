/**
 * Data table (spec/ui-standards/tables.md): data-type alignment, responsive column-hiding by
 * priority (+ card layout below 600px), density by viewport, header sorting, row selection
 * with select-all, keyboard row navigation, per-row/per-cell error indicators, and
 * empty / loading / error states. The header row is sticky so columns stay legible.
 */
import { type JSX, For, Show, createMemo } from 'solid-js';
import { viewport, BP } from '../state/viewport';
import { Checkbox } from './inputs/Checkbox';
import { alignOf, renderText, rowHeight, type Column, type Density, type SortState } from './table-model';

export interface TableProps<Row> {
  columns: Column<Row>[];
  rows: Row[];
  getRowId: (row: Row) => string;
  density?: Density;
  selectable?: boolean;
  selected?: Set<string>;
  onSelectedChange?: (selected: Set<string>) => void;
  sort?: SortState;
  onSort?: (sort: SortState) => void;
  /** Client-side sorting on the current rows (off when the server sorts). */
  clientSort?: boolean;
  rowError?: (row: Row) => string | undefined;
  cellError?: (row: Row, key: string) => string | undefined;
  onRowClick?: (row: Row) => void;
  caption?: string;
  emptyText?: string;
  /** No-matches variant with a clear-filters affordance (tables.md › states). */
  emptyFiltered?: boolean;
  onClearFilters?: () => void;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  stickyHeader?: boolean;
}

export function Table<Row>(props: TableProps<Row>): JSX.Element {
  const isCard = createMemo(() => viewport.below(BP.phone));

  const effectiveDensity = createMemo((): Exclude<Density, 'auto'> => {
    if (props.density && props.density !== 'auto') return props.density;
    return viewport.below(BP.desktop) ? 'spacious' : 'comfortable';
  });

  const visibleColumns = createMemo(() => {
    const w = viewport.width;
    return props.columns.filter((c) => {
      const p = c.priority ?? 2;
      if (w >= BP.desktop) return true;
      if (w >= BP.tabletPortrait) return p <= 2; // hide P3
      return p <= 1; // tablet portrait: P1 in the grid; rest scroll
    });
  });

  const identifierCol = createMemo(() => props.columns.find((c) => c.role === 'identifier') ?? props.columns[0]!);
  const statusCol = createMemo(() => props.columns.find((c) => c.role === 'status'));

  const sortedRows = createMemo(() => {
    const s = props.sort;
    if (props.clientSort === false || !s) return props.rows;
    const col = props.columns.find((c) => c.key === s.key);
    if (!col) return props.rows;
    const dir = s.dir === 'asc' ? 1 : -1;
    const val = (r: Row) => (col.accessor ? col.accessor(r) : (r as Record<string, unknown>)[col.key]);
    return [...props.rows].sort((a, b) => {
      const av = val(a) as never;
      const bv = val(b) as never;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  });

  const allIds = createMemo(() => sortedRows().map(props.getRowId));
  const sel = () => props.selected ?? new Set<string>();
  const allSelected = createMemo(() => allIds().length > 0 && allIds().every((id) => sel().has(id)));
  const someSelected = createMemo(() => allIds().some((id) => sel().has(id)) && !allSelected());

  const toggleRow = (id: string) => {
    const next = new Set(sel());
    next.has(id) ? next.delete(id) : next.add(id);
    props.onSelectedChange?.(next);
  };
  const toggleAll = () => props.onSelectedChange?.(allSelected() ? new Set() : new Set(allIds()));

  const toggleSort = (col: Column<Row>) => {
    if (!col.sortable) return;
    const dir = props.sort?.key === col.key && props.sort.dir === 'asc' ? 'desc' : 'asc';
    props.onSort?.({ key: col.key, dir });
  };
  const sortIndicator = (col: Column<Row>) => (props.sort?.key !== col.key ? '' : props.sort.dir === 'asc' ? '▲' : '▼');

  const onRowKeydown = (e: KeyboardEvent, row: Row) => {
    const el = e.currentTarget as HTMLElement;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      (el.nextElementSibling as HTMLElement | null)?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      (el.previousElementSibling as HTMLElement | null)?.focus();
    } else if (e.key === ' ' && props.selectable) {
      e.preventDefault();
      toggleRow(props.getRowId(row));
    } else if (e.key === 'Enter') {
      props.onRowClick?.(row);
    }
  };

  const cellContent = (col: Column<Row>, row: Row) => (col.cell ? col.cell(row) : <span class="cell-clamp">{renderText(col, row)}</span>);
  const colCount = () => visibleColumns().length + (props.selectable ? 1 : 0);

  const EmptyRow = () => (
    <Show when={props.error} fallback={<EmptyState />}>
      <tr>
        <td class="table-empty" colspan={colCount()}>
          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '8px', 'align-items': 'center' }}>
            <span>{props.error}</span>
            <Show when={props.onRetry}>
              <button class="btn btn--secondary btn--compact" type="button" onClick={() => props.onRetry?.()}>
                Retry
              </button>
            </Show>
          </div>
        </td>
      </tr>
    </Show>
  );

  const EmptyState = () => (
    <tr>
      <td class="table-empty" colspan={colCount()}>
        <Show
          when={props.emptyFiltered}
          fallback={props.emptyText ?? 'Nothing to show.'}
        >
          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '8px', 'align-items': 'center' }}>
            <span>No matches for the current filter.</span>
            <Show when={props.onClearFilters}>
              <button class="btn btn--ghost btn--compact" type="button" onClick={() => props.onClearFilters?.()}>
                Clear filters
              </button>
            </Show>
          </div>
        </Show>
      </td>
    </tr>
  );

  return (
    <Show when={!isCard()} fallback={<Cards />}>
      <div class={`table-scroll${props.stickyHeader !== false ? '' : ''}`}>
        <table
          class={`table${props.stickyHeader !== false ? ' table--sticky' : ''}${
            effectiveDensity() === 'spacious' ? ' table--touch' : ''
          }`}
          style={{ '--row-h': `${rowHeight(effectiveDensity())}px` }}
        >
          <Show when={props.caption}>
            <caption class="visually-hidden">{props.caption}</caption>
          </Show>
          <thead>
            <tr>
              <Show when={props.selectable}>
                <th class="select-col" scope="col">
                  <Checkbox
                    checked={allSelected()}
                    indeterminate={someSelected()}
                    ariaLabel="Select all rows"
                    onChange={toggleAll}
                  />
                </th>
              </Show>
              <For each={visibleColumns()}>
                {(col) => (
                  <th
                    scope="col"
                    class={col.numeric ? 'is-numeric' : undefined}
                    style={{ width: col.width, 'min-width': col.minWidth, 'text-align': alignOf(col) }}
                    aria-sort={
                      props.sort?.key === col.key ? (props.sort.dir === 'asc' ? 'ascending' : 'descending') : undefined
                    }
                  >
                    <Show when={col.sortable} fallback={col.header}>
                      <button class="sort-btn" type="button" onClick={() => toggleSort(col)}>
                        <span>{col.header}</span>
                        <span class="sort-ind" aria-hidden="true">
                          {sortIndicator(col)}
                        </span>
                      </button>
                    </Show>
                  </th>
                )}
              </For>
            </tr>
          </thead>
          <tbody>
            <Show when={props.loading && sortedRows().length === 0}>
              <tr>
                <td class="table-loading" colspan={colCount()}>
                  <span class="spinner" aria-label="Loading" /> Loading…
                </td>
              </tr>
            </Show>
            <Show when={!props.loading && sortedRows().length === 0}>
              <EmptyRow />
            </Show>
            <For each={sortedRows()}>
              {(row) => {
                const id = props.getRowId(row);
                const err = () => props.rowError?.(row);
                return (
                  <tr
                    classList={{
                      'is-selected': sel().has(id),
                      'has-error': !!err(),
                      'is-clickable': !!props.onRowClick
                    }}
                    tabindex="0"
                    onKeyDown={(e) => onRowKeydown(e, row)}
                    onClick={() => props.onRowClick?.(row)}
                    title={err()}
                  >
                    <Show when={props.selectable}>
                      <td class="select-col" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={sel().has(id)} ariaLabel="Select row" onChange={() => toggleRow(id)} />
                      </td>
                    </Show>
                    <For each={visibleColumns()}>
                      {(col) => {
                        const cErr = () => props.cellError?.(row, col.key);
                        return (
                          <td
                            classList={{ 'is-numeric': col.numeric, 'has-cell-error': !!cErr() }}
                            style={{ 'text-align': alignOf(col) }}
                            title={cErr() ?? col.tooltip?.(row)}
                          >
                            {cellContent(col, row)}
                            <Show when={cErr()}>
                              <span class="cell-err-icon" aria-label={cErr()}>
                                ⚠
                              </span>
                            </Show>
                          </td>
                        );
                      }}
                    </For>
                  </tr>
                );
              }}
            </For>
          </tbody>
        </table>
      </div>
    </Show>
  );

  // ── Card layout below 600px ─────────────────────────────────────────────────
  function Cards() {
    return (
      <div class="cards">
        <Show when={props.loading && sortedRows().length === 0}>
          <p class="table-loading">
            <span class="spinner" aria-label="Loading" /> Loading…
          </p>
        </Show>
        <Show when={!props.loading && sortedRows().length === 0}>
          <p class="table-empty">
            {props.error ?? (props.emptyFiltered ? 'No matches for the current filter.' : props.emptyText ?? 'Nothing to show.')}
          </p>
        </Show>
        <For each={sortedRows()}>
          {(row) => {
            const id = props.getRowId(row);
            const err = () => props.rowError?.(row);
            return (
              <article
                classList={{ card: true, 'has-error': !!err(), 'is-clickable': !!props.onRowClick }}
                onClick={() => props.onRowClick?.(row)}
              >
                <header class="card__header">
                  <Show when={props.selectable}>
                    <span onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={sel().has(id)} ariaLabel="Select row" onChange={() => toggleRow(id)} />
                    </span>
                  </Show>
                  <span class="card__id">{cellContent(identifierCol(), row)}</span>
                  <Show when={statusCol()}>
                    <span>{cellContent(statusCol()!, row)}</span>
                  </Show>
                </header>
                <dl>
                  <For each={props.columns}>
                    {(col) => (
                      <Show when={col !== identifierCol() && col !== statusCol()}>
                        <div>
                          <dt>{col.header}</dt>
                          <dd classList={{ 'is-numeric': col.numeric, 'has-cell-error': !!props.cellError?.(row, col.key) }}>
                            {cellContent(col, row)}
                          </dd>
                        </div>
                      </Show>
                    )}
                  </For>
                </dl>
                <Show when={err()}>
                  <p class="card__err" role="alert">
                    ⚠ {err()}
                  </p>
                </Show>
              </article>
            );
          }}
        </For>
      </div>
    );
  }
}
