import { h, each, type Child } from '../core/dom';
import { icon } from '../icons';
import { type Getter } from '../core/signal';

export interface Column<T> {
  key: string;
  header: string;
  num?: boolean; // right-aligned tabular numeric
  priority?: 2 | 3; // omitted = P1 (never hidden)
  sortable?: boolean;
  ellipsis?: boolean;
  width?: string;
  render: (row: T) => Child;
}

export type TableState = 'normal' | 'loading' | 'empty-none' | 'empty-filtered' | 'error';

export interface TableOpts<T> {
  columns: Column<T>[];
  rows: Getter<T[]>;
  rowKey: (row: T) => string;
  state: Getter<TableState>;
  selectable?: boolean;
  selected?: Getter<Set<string>>;
  onToggleRow?: (key: string) => void;
  onToggleAll?: (checked: boolean) => void;
  onRowClick?: (row: T) => void;
  rowError?: (row: T) => boolean;
  sort?: Getter<{ key: string; desc: boolean } | null>;
  onSort?: (key: string) => void;
  onClearFilters?: () => void;
  onRetry?: () => void;
  emptyNoneMessage?: string;
  emptyFilteredMessage?: string;
}

function colClass<T>(col: Column<T>): string {
  const c: string[] = [];
  if (col.num) c.push('num');
  if (col.priority === 2) c.push('p2');
  if (col.priority === 3) c.push('p3');
  if (col.ellipsis) c.push('ellipsis');
  return c.join(' ');
}

export function dataTable<T>(opts: TableOpts<T>): HTMLElement {
  const colCount = opts.columns.length + (opts.selectable ? 1 : 0);

  const headSort = (col: Column<T>) => {
    const s = opts.sort?.();
    if (!s || s.key !== col.key) return null;
    return h('span', { class: 'sortind' }, icon(s.desc ? 'sort-desc' : 'sort-asc', { size: 16 }));
  };

  const allChecked = () => {
    const rows = opts.rows();
    const sel = opts.selected?.();
    return rows.length > 0 && !!sel && rows.every((r) => sel.has(opts.rowKey(r)));
  };

  const thead = h(
    'thead',
    null,
    h(
      'tr',
      null,
      opts.selectable
        ? h('th', { class: 'checkcell' },
            h('input', {
              type: 'checkbox',
              'aria-label': 'Select all',
              checked: allChecked,
              onchange: (e: Event) => opts.onToggleAll?.((e.target as HTMLInputElement).checked),
            }))
        : null,
      ...opts.columns.map((col) =>
        h('th', {
          class: `${colClass(col)}${col.sortable ? ' sortable' : ''}`,
          style: col.width ? { width: col.width } : undefined,
          'aria-sort': () => {
            const s = opts.sort?.();
            if (!s || s.key !== col.key) return col.sortable ? 'none' : undefined;
            return s.desc ? 'descending' : 'ascending';
          },
          onclick: col.sortable ? () => opts.onSort?.(col.key) : undefined,
        }, h('span', null, col.header), col.sortable ? () => headSort(col) : null),
      ),
    ),
  );

  const stateRow = (content: Child) =>
    h('tr', null, h('td', { colspan: String(colCount) }, h('div', { class: 'table-state' }, content)));

  const body = h('tbody', null, () => {
    const state = opts.state();
    if (state === 'loading') {
      return stateRow(h('div', { class: 'row', style: { 'justify-content': 'center' } }, h('span', { class: 'spinner' }), h('span', { class: 'muted' }, 'Loading…')));
    }
    if (state === 'error') {
      return stateRow(h('div', null, h('p', null, 'Something went wrong loading this list.'), opts.onRetry ? h('a', { onclick: opts.onRetry }, 'Retry') : null));
    }
    if (state === 'empty-none') {
      return stateRow(h('span', null, opts.emptyNoneMessage ?? 'No records yet.'));
    }
    if (state === 'empty-filtered') {
      return stateRow(h('div', null, h('p', null, opts.emptyFilteredMessage ?? 'No matches for the current filter.'), opts.onClearFilters ? h('a', { onclick: opts.onClearFilters }, 'Clear filters') : null));
    }
    return each(opts.rows, (row) => {
      const key = opts.rowKey(row);
      const isSel = () => !!opts.selected?.().has(key);
      return h(
        'tr',
        {
          class: () => `${opts.onRowClick ? 'clickable' : ''}${isSel() ? ' selected' : ''}`,
          onclick: (e: MouseEvent) => {
            if ((e.target as HTMLElement).closest('input,button,a')) return;
            opts.onRowClick?.(row);
          },
        },
        opts.selectable
          ? h('td', { class: 'checkcell' },
              h('input', {
                type: 'checkbox',
                'aria-label': 'Select row',
                checked: isSel,
                onchange: () => opts.onToggleRow?.(key),
              }))
          : null,
        ...opts.columns.map((col, ci) =>
          h('td', { class: colClass(col) },
            ci === 0 && opts.rowError?.(row) ? h('span', { class: 'cell-error', title: 'This line has an error' }, icon('circle-alert', { size: 14 })) : null,
            col.render(row)),
        ),
      );
    })();
  });

  return h('div', { class: 'tablewrap' }, h('table', { class: 'grid', role: 'grid' }, thead, body));
}
