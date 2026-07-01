import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '@/icons/Icon';
import { Button } from './Button';
import './DataTable.css';

/**
 * Shared data table per spec/ui-standards/tables.md:
 *  - data-type alignment (numbers right + tabular, text left); header matches cells
 *  - column priority: lower priorities hide first as the viewport narrows
 *    (≥1100 all · 800–1100 hide P3 · 600–800 hide P2+P3 · <600 card layout)
 *  - selection (row checkboxes + select-all), sorting (accent direction indicator)
 *  - persistent header row; four states (normal / loading / empty / error)
 */
export type Align = 'left' | 'right' | 'center';
export type Priority = 1 | 2 | 3;

export interface Column<T> {
  key: string;
  header: ReactNode;
  align?: Align;
  priority?: Priority;
  sortable?: boolean;
  /** Sort field sent to the API; defaults to key. */
  sortKey?: string;
  width?: number | string;
  render: (row: T) => ReactNode;
  /** Numeric columns get tabular figures automatically when align='right'. */
  className?: string;
}

export interface SortState {
  key: string;
  desc: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  emptyMessage?: string;
  emptyFilteredMessage?: string;
  isFiltered?: boolean;
  onClearFilters?: () => void;
  rowError?: (row: T) => boolean;
  /** Accessible caption. */
  caption?: string;
}

interface Tier {
  maxPriority: Priority;
  density: 'comfortable' | 'spacious';
  card: boolean;
}

function tierForWidth(w: number): Tier {
  if (w >= 1100) return { maxPriority: 3, density: 'comfortable', card: false };
  if (w >= 800) return { maxPriority: 2, density: 'spacious', card: false };
  if (w >= 600) return { maxPriority: 1, density: 'spacious', card: false };
  return { maxPriority: 3, density: 'spacious', card: true }; // card shows all fields
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  selectable = false,
  selectedIds,
  onSelectionChange,
  sort,
  onSortChange,
  onRowClick,
  loading = false,
  error,
  onRetry,
  emptyMessage = 'No records yet',
  emptyFilteredMessage = 'No matches for the current filter',
  isFiltered = false,
  onClearFilters,
  rowError,
  caption,
}: DataTableProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tier, setTier] = useState<Tier>({ maxPriority: 3, density: 'comfortable', card: false });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      setTier(tierForWidth(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const visibleColumns = columns.filter((c) => (c.priority ?? 1) <= tier.maxPriority);
  const selected = selectedIds ?? new Set<string>();
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(rowKey(r)));
  const someSelected = rows.some((r) => selected.has(rowKey(r)));

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) onSelectionChange(new Set());
    else onSelectionChange(new Set(rows.map(rowKey)));
  };
  const toggleOne = (id: string) => {
    if (!onSelectionChange) return;
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  const onHeaderSort = (col: Column<T>) => {
    if (!col.sortable || !onSortChange) return;
    const key = col.sortKey ?? col.key;
    if (sort?.key === key) onSortChange({ key, desc: !sort.desc });
    else onSortChange({ key, desc: false });
  };

  const colCount = visibleColumns.length + (selectable ? 1 : 0);

  // ---------- state overlays ----------
  const showEmpty = !loading && !error && rows.length === 0;

  // ---------- card layout (<600px) ----------
  if (tier.card && !showEmpty && !error) {
    return (
      <div ref={containerRef} className="oms-table-wrap oms-table-wrap--cards">
        {loading && rows.length === 0 ? (
          <TableSkeletonCards />
        ) : (
          <ul className="oms-cards" aria-busy={loading || undefined}>
            {rows.map((row) => {
              const id = rowKey(row);
              const isErr = rowError?.(row) ?? false;
              return (
                <li
                  key={id}
                  className={`oms-card${isErr ? ' is-error' : ''}${
                    selected.has(id) ? ' is-selected' : ''
                  }`}
                  onClick={() => onRowClick?.(row)}
                >
                  <div className="oms-card__grid">
                    {columns.map((col) => (
                      <div key={col.key} className="oms-card__field">
                        <span className="oms-card__label">{col.header}</span>
                        <span className={`oms-card__value oms-align-${col.align ?? 'left'}`}>
                          {col.render(row)}
                        </span>
                      </div>
                    ))}
                  </div>
                  {selectable && (
                    <label className="oms-card__select" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(id)}
                        onChange={() => toggleOne(id)}
                        aria-label="Select row"
                      />
                    </label>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="oms-table-wrap">
      <table
        className={`oms-table oms-table--${tier.density}`}
        role="grid"
        aria-busy={loading || undefined}
      >
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {selectable && (
              <th className="oms-th oms-th--check" scope="col">
                <label className="oms-check">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = !allSelected && someSelected;
                    }}
                    onChange={toggleAll}
                    aria-label="Select all rows"
                  />
                </label>
              </th>
            )}
            {visibleColumns.map((col) => {
              const key = col.sortKey ?? col.key;
              const active = sort?.key === key;
              return (
                <th
                  key={col.key}
                  scope="col"
                  className={`oms-th oms-align-${col.align ?? 'left'}${
                    col.sortable ? ' oms-th--sortable' : ''
                  }`}
                  style={{ width: col.width }}
                  aria-sort={active ? (sort!.desc ? 'descending' : 'ascending') : undefined}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      className="oms-th__sort"
                      onClick={() => onHeaderSort(col)}
                    >
                      <span>{col.header}</span>
                      {active && (
                        <Icon
                          name={sort!.desc ? 'sort-desc' : 'sort-asc'}
                          size={14}
                          className="oms-th__sort-ind"
                        />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {error ? (
            <tr>
              <td colSpan={colCount} className="oms-table__state">
                <div className="oms-table__state-inner">
                  <Icon name="circle-alert" size={24} className="oms-table__state-icon-error" />
                  <p>{error}</p>
                  {onRetry && (
                    <Button variant="secondary" icon="refresh" onClick={onRetry}>
                      Retry
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ) : showEmpty ? (
            <tr>
              <td colSpan={colCount} className="oms-table__state">
                <div className="oms-table__state-inner">
                  <p>{isFiltered ? emptyFilteredMessage : emptyMessage}</p>
                  {isFiltered && onClearFilters && (
                    <Button variant="ghost" icon="minus-circle" onClick={onClearFilters}>
                      Clear filters
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ) : loading && rows.length === 0 ? (
            <TableSkeletonRows cols={colCount} />
          ) : (
            rows.map((row) => {
              const id = rowKey(row);
              const isErr = rowError?.(row) ?? false;
              const isSel = selected.has(id);
              return (
                <tr
                  key={id}
                  className={`oms-tr${isSel ? ' is-selected' : ''}${isErr ? ' is-error' : ''}${
                    onRowClick ? ' is-clickable' : ''
                  }`}
                  onClick={() => onRowClick?.(row)}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (onRowClick && (e.key === 'Enter')) onRowClick(row);
                  }}
                >
                  {selectable && (
                    <td className="oms-td oms-td--check" onClick={(e) => e.stopPropagation()}>
                      <label className="oms-check">
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => toggleOne(id)}
                          aria-label="Select row"
                        />
                      </label>
                    </td>
                  )}
                  {visibleColumns.map((col) => (
                    <td
                      key={col.key}
                      className={`oms-td oms-align-${col.align ?? 'left'}${
                        col.align === 'right' ? ' tabular' : ''
                      }${col.className ? ` ${col.className}` : ''}`}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function TableSkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 6 }).map((_, r) => (
        <tr key={r} className="oms-tr oms-tr--skeleton">
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c} className="oms-td">
              <span className="oms-skeleton" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function TableSkeletonCards() {
  return (
    <ul className="oms-cards">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="oms-card">
          <span className="oms-skeleton" style={{ height: 48 }} />
        </li>
      ))}
    </ul>
  );
}
