/** Shared types for the data Table (tables.md). */

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
	/** Value used for default rendering and client-side sorting. */
	accessor?: (row: Row) => unknown;
	/** Pre-formatted display string (overrides accessor for rendering). */
	format?: (row: Row) => string;
	/** Tooltip text for truncated/coded values. */
	tooltip?: (row: Row) => string | undefined;
	/** Card-layout hints: which column is the identifier vs the status badge. */
	role?: 'identifier' | 'status';
}

export interface SortState {
	key: string;
	dir: SortDir;
}

/** Resolve the effective alignment for a column. */
export function alignOf<Row>(col: Column<Row>): Align {
	return col.align ?? (col.numeric ? 'right' : 'left');
}

/** Default text rendering for a cell when no custom snippet is supplied. */
export function renderCell<Row>(col: Column<Row>, row: Row): string {
	if (col.format) return col.format(row);
	const v = col.accessor ? col.accessor(row) : (row as Record<string, unknown>)[col.key];
	return v == null ? '' : String(v);
}

/** Row height in px for a resolved density. */
export function rowHeight(density: Exclude<Density, 'auto'>): number {
	return density === 'compact' ? 40 : density === 'spacious' ? 64 : 52;
}
