/** Shared types/helpers for the data Table (spec/ui-standards/tables.md). */
import type { JSX } from 'solid-js';

export type Align = 'left' | 'right' | 'center';
/** Lower priority hides first as the viewport narrows. 1 = never hidden. */
export type ColumnPriority = 1 | 2 | 3;
export type Density = 'compact' | 'comfortable' | 'spacious' | 'auto';
export type SortDir = 'asc' | 'desc';

export interface Column<Row> {
  key: string;
  header: string;
  /** Cell + header alignment. Defaults to 'right' for numeric, else 'left'. */
  align?: Align;
  priority?: ColumnPriority;
  /** Fixed CSS width, e.g. '120px'. Omit for flex columns (long text). */
  width?: string;
  minWidth?: string;
  sortable?: boolean;
  /** Right-aligned, tabular figures. */
  numeric?: boolean;
  /** Value for default rendering + client-side sorting. */
  accessor?: (row: Row) => unknown;
  /** Pre-formatted display string (overrides accessor for text rendering). */
  format?: (row: Row) => string;
  /** Custom cell content (overrides format/accessor). */
  cell?: (row: Row) => JSX.Element;
  /** Tooltip for truncated/coded values. */
  tooltip?: (row: Row) => string | undefined;
  /** Card-layout hints: which column is the identifier vs the status badge. */
  role?: 'identifier' | 'status';
}

export interface SortState {
  key: string;
  dir: SortDir;
}

export function alignOf<Row>(col: Column<Row>): Align {
  return col.align ?? (col.numeric ? 'right' : 'left');
}

/** Default text rendering for a cell (used when no `cell` snippet is supplied). */
export function renderText<Row>(col: Column<Row>, row: Row): string {
  if (col.format) return col.format(row);
  const v = col.accessor ? col.accessor(row) : (row as Record<string, unknown>)[col.key];
  return v == null ? '' : String(v);
}

export function rowHeight(density: Exclude<Density, 'auto'>): number {
  return density === 'compact' ? 40 : density === 'spacious' ? 64 : 52;
}
