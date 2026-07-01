// Reusable data table. Renders a semantic <table> and applies the shared table
// standards: alignment by data type, priority-based responsive hiding, row
// selection with a header select-all, sortable headers, and the four
// presentation states. See ../../spec/ui-standards/tables.md.

import './table.css';
import { el } from '../framework/dom.ts';
import { icon } from './icon.ts';

export type Align = 'left' | 'right' | 'center';

export interface Column<Row> {
  key: string;
  header: string;
  align?: Align;
  priority?: 1 | 2 | 3; // P2 hides ≤800px, P3 hides ≤1100px
  sortable?: boolean;
  sortField?: string; // API sort key; defaults to key
  width?: string;
  render: (row: Row) => Node | string;
  headerTitle?: string;
}

export type TableState = 'normal' | 'loading' | 'empty' | 'error';

export interface TableProps<Row> {
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  onRowClick?: (row: Row) => void;
  sort?: { field: string; desc: boolean };
  onSort?: (field: string) => void;
  state?: TableState;
  emptyMessage?: Node | string;
  filteredEmptyMessage?: Node | string;
  isFiltered?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  onClearFilters?: () => void;
  rowClass?: (row: Row) => string;
  ariaLabel?: string;
}

const alignClass = (a?: Align) => (a === 'right' ? 'col-right' : a === 'center' ? 'col-center' : '');
const priorityClass = (p?: 1 | 2 | 3) => (p === 2 ? 'p2' : p === 3 ? 'p3' : '');

export function table<Row>(props: TableProps<Row>): HTMLElement {
  const state: TableState = props.state ?? 'normal';
  const cols = props.columns;
  const totalCols = cols.length + (props.selectable ? 1 : 0);

  const selected = props.selectedIds ?? new Set<string>();
  const allKeys = props.rows.map(props.rowKey);
  const allSelected = allKeys.length > 0 && allKeys.every((k) => selected.has(k));
  const someSelected = allKeys.some((k) => selected.has(k)) && !allSelected;

  const emitSelection = (next: Set<string>) => props.onSelectionChange?.(next);

  // ---- Header ----
  const headerCells: Node[] = [];
  if (props.selectable) {
    const selectAll = el('input', {
      type: 'checkbox',
      'aria-label': 'Select all rows',
      checked: allSelected,
      onclick: (e: Event) => {
        const next = new Set(selected);
        if ((e.target as HTMLInputElement).checked) allKeys.forEach((k) => next.add(k));
        else allKeys.forEach((k) => next.delete(k));
        emitSelection(next);
      },
    }) as HTMLInputElement;
    selectAll.indeterminate = someSelected;
    headerCells.push(el('th', { class: 'cell-check' }, selectAll));
  }

  for (const col of cols) {
    const field = col.sortField ?? col.key;
    const isActive = props.sort?.field === field;
    const sortable = col.sortable && props.onSort;
    headerCells.push(
      el(
        'th',
        {
          class: `${alignClass(col.align)} ${priorityClass(col.priority)} ${sortable ? 'sortable' : ''}`,
          style: col.width ? { width: col.width } : undefined,
          title: col.headerTitle,
          'aria-sort': isActive ? (props.sort!.desc ? 'descending' : 'ascending') : undefined,
          onclick: sortable ? () => props.onSort!(field) : undefined,
        },
        el('span', null, col.header),
        isActive
          ? el('span', { class: 'sort-ind' }, icon(props.sort!.desc ? 'chevron-down' : 'chevron-down', 14))
          : null,
      ),
    );
  }

  const thead = el('thead', null, el('tr', null, ...headerCells));

  // ---- Body ----
  let tbody: HTMLElement;

  if (state === 'loading') {
    tbody = el(
      'tbody',
      null,
      ...Array.from({ length: 6 }, () =>
        el(
          'tr',
          { class: 'skeleton-row' },
          ...Array.from({ length: totalCols }, () => el('td', null, el('div'))),
        ),
      ),
    );
  } else if (state === 'error') {
    tbody = el(
      'tbody',
      null,
      el(
        'tr',
        null,
        el(
          'td',
          { colspan: String(totalCols) },
          el(
            'div',
            { class: 'table-state' },
            icon('circle-alert', 28),
            el('div', null, props.errorMessage ?? 'Something went wrong.'),
            props.onRetry
              ? el('button', { class: 'btn btn-secondary', onclick: () => props.onRetry!() }, 'Retry')
              : null,
          ),
        ),
      ),
    );
  } else if (props.rows.length === 0) {
    const msg = props.isFiltered
      ? props.filteredEmptyMessage ?? 'No stocktakes match the current filter.'
      : props.emptyMessage ?? 'Nothing here yet.';
    tbody = el(
      'tbody',
      null,
      el(
        'tr',
        null,
        el(
          'td',
          { colspan: String(totalCols) },
          el(
            'div',
            { class: 'table-state' },
            el('div', null, msg),
            props.isFiltered && props.onClearFilters
              ? el('button', { class: 'btn btn-secondary', onclick: () => props.onClearFilters!() }, 'Clear filters')
              : null,
          ),
        ),
      ),
    );
  } else {
    tbody = el(
      'tbody',
      null,
      ...props.rows.map((row) => {
        const key = props.rowKey(row);
        const isSelected = selected.has(key);
        const cells: Node[] = [];

        if (props.selectable) {
          cells.push(
            el(
              'td',
              { class: 'cell-check', onclick: (e: Event) => e.stopPropagation() },
              el('input', {
                type: 'checkbox',
                'aria-label': 'Select row',
                checked: isSelected,
                onclick: (e: Event) => {
                  const next = new Set(selected);
                  if ((e.target as HTMLInputElement).checked) next.add(key);
                  else next.delete(key);
                  emitSelection(next);
                },
              }),
            ),
          );
        }

        for (const col of cols) {
          cells.push(
            el(
              'td',
              { class: `${alignClass(col.align)} ${priorityClass(col.priority)}` },
              col.render(row),
            ),
          );
        }

        const extra = props.rowClass?.(row) ?? '';
        return el(
          'tr',
          {
            class: `${isSelected ? 'selected' : ''} ${props.onRowClick ? 'clickable' : ''} ${extra}`,
            onclick: props.onRowClick ? () => props.onRowClick!(row) : undefined,
          },
          ...cells,
        );
      }),
    );
  }

  return el(
    'div',
    { class: 'table-wrap' },
    el('table', { class: 'data', role: 'grid', 'aria-label': props.ariaLabel }, thead, tbody),
  );
}
