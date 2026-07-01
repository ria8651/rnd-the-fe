<script lang="ts" generics="Row">
	import type { Snippet } from 'svelte';
	import { viewport, BP } from './viewport.svelte';
	import Checkbox from './inputs/Checkbox.svelte';
	import {
		alignOf,
		renderCell,
		rowHeight,
		type Column,
		type Density,
		type SortState
	} from './table';

	let {
		columns,
		rows,
		getRowId,
		density = 'auto',
		selectable = false,
		selected = $bindable(new Set<string>()),
		sort = $bindable<SortState | undefined>(undefined),
		clientSort = true,
		onsort,
		rowError,
		cellError,
		onRowClick,
		caption,
		emptyText = 'Nothing to show.',
		stickyHeader = true,
		cell
	}: {
		columns: Column<Row>[];
		rows: Row[];
		getRowId: (row: Row) => string;
		density?: Density;
		selectable?: boolean;
		selected?: Set<string>;
		sort?: SortState | undefined;
		clientSort?: boolean;
		onsort?: (sort: SortState) => void;
		rowError?: (row: Row) => string | undefined;
		cellError?: (row: Row, key: string) => string | undefined;
		onRowClick?: (row: Row) => void;
		caption?: string;
		emptyText?: string;
		stickyHeader?: boolean;
		cell?: Snippet<[Row, Column<Row>]>;
	} = $props();

	// ── Responsive: effective density, visible columns, card mode ──────────────
	const isCard = $derived(viewport.below(BP.phone));

	const effectiveDensity = $derived.by((): Exclude<Density, 'auto'> => {
		if (density !== 'auto') return density;
		return viewport.below(BP.desktop) ? 'spacious' : 'comfortable';
	});

	const visibleColumns = $derived.by(() => {
		const w = viewport.width;
		return columns.filter((c) => {
			const p = c.priority ?? 2;
			if (w >= BP.desktop) return true; // all
			if (w >= BP.tabletPortrait) return p <= 2; // hide P3
			return p <= 1; // tablet portrait: P1 only in the grid (rest scroll/card)
		});
	});

	const identifierCol = $derived(
		columns.find((c) => c.role === 'identifier') ?? columns[0]
	);
	const statusCol = $derived(columns.find((c) => c.role === 'status'));

	// ── Sorting ────────────────────────────────────────────────────────────────
	const sortedRows = $derived.by(() => {
		if (!clientSort || !sort) return rows;
		const col = columns.find((c) => c.key === sort!.key);
		if (!col) return rows;
		const dir = sort.dir === 'asc' ? 1 : -1;
		const val = (r: Row) =>
			col.accessor ? col.accessor(r) : (r as Record<string, unknown>)[col.key];
		return [...rows].sort((a, b) => {
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

	function toggleSort(col: Column<Row>) {
		if (!col.sortable) return;
		const dir = sort?.key === col.key && sort.dir === 'asc' ? 'desc' : 'asc';
		sort = { key: col.key, dir };
		onsort?.(sort);
	}

	// ── Selection ───────────────────────────────────────────────────────────────
	const allIds = $derived(sortedRows.map(getRowId));
	const allSelected = $derived(allIds.length > 0 && allIds.every((id) => selected.has(id)));
	const someSelected = $derived(allIds.some((id) => selected.has(id)) && !allSelected);

	function toggleRow(id: string) {
		const next = new Set(selected);
		next.has(id) ? next.delete(id) : next.add(id);
		selected = next;
	}
	function toggleAll() {
		selected = allSelected ? new Set() : new Set(allIds);
	}

	// ── Keyboard row navigation (tables.md › Keyboard navigation) ─────────────────
	function onRowKeydown(e: KeyboardEvent, row: Row) {
		const el = e.currentTarget as HTMLElement;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			(el.nextElementSibling as HTMLElement | null)?.focus();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			(el.previousElementSibling as HTMLElement | null)?.focus();
		} else if (e.key === ' ' && selectable) {
			e.preventDefault();
			toggleRow(getRowId(row));
		} else if (e.key === 'Enter') {
			onRowClick?.(row);
		}
	}

	function sortIndicator(col: Column<Row>): string {
		if (sort?.key !== col.key) return '';
		return sort.dir === 'asc' ? '▲' : '▼';
	}
</script>

{#if isCard}
	<!-- Card layout below 600px (tables.md › Card layout). Every column appears as a field. -->
	<div class="cards">
		{#if sortedRows.length === 0}
			<p class="empty">{emptyText}</p>
		{/if}
		{#each sortedRows as row (getRowId(row))}
			{@const id = getRowId(row)}
			{@const err = rowError?.(row)}
			<article class="card" class:has-error={!!err}>
				<header>
					{#if selectable}
						<Checkbox
							checked={selected.has(id)}
							ariaLabel="Select row"
							onchange={() => toggleRow(id)}
						/>
					{/if}
					<span class="card-id">{renderCell(identifierCol, row)}</span>
					{#if statusCol}
						<span class="card-status">
							{#if cell}{@render cell(row, statusCol)}{:else}{renderCell(statusCol, row)}{/if}
						</span>
					{/if}
				</header>
				<dl>
					{#each columns as col (col.key)}
						{#if col !== identifierCol && col !== statusCol}
							<div>
								<dt>{col.header}</dt>
								<dd
									class:numeric={col.numeric}
									class:cell-error={!!cellError?.(row, col.key)}
								>
									{#if cell}{@render cell(row, col)}{:else}{renderCell(col, row)}{/if}
								</dd>
							</div>
						{/if}
					{/each}
				</dl>
				{#if err}<p class="card-err" role="alert"><span aria-hidden="true">⚠</span> {err}</p>{/if}
			</article>
		{/each}
	</div>
{:else}
	<div class="scroller" class:sticky={stickyHeader}>
		<table style="--row-h: {rowHeight(effectiveDensity)}px" class:touch={effectiveDensity === 'spacious'}>
			{#if caption}<caption class="visually-hidden">{caption}</caption>{/if}
			<thead>
				<tr>
					{#if selectable}
						<th class="select-col" scope="col">
							<Checkbox
								checked={allSelected}
								indeterminate={someSelected}
								ariaLabel="Select all rows"
								onchange={toggleAll}
							/>
						</th>
					{/if}
					{#each visibleColumns as col (col.key)}
						<th
							scope="col"
							style:width={col.width}
							style:min-width={col.minWidth}
							style:text-align={alignOf(col)}
							aria-sort={sort?.key === col.key
								? sort.dir === 'asc'
									? 'ascending'
									: 'descending'
								: undefined}
						>
							{#if col.sortable}
								<button class="sort-btn" type="button" onclick={() => toggleSort(col)}>
									<span>{col.header}</span>
									<span class="sort-ind" aria-hidden="true">{sortIndicator(col)}</span>
								</button>
							{:else}
								{col.header}
							{/if}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#if sortedRows.length === 0}
					<tr>
						<td class="empty" colspan={visibleColumns.length + (selectable ? 1 : 0)}>{emptyText}</td>
					</tr>
				{/if}
				{#each sortedRows as row (getRowId(row))}
					{@const id = getRowId(row)}
					{@const err = rowError?.(row)}
					<tr
						class:selected={selected.has(id)}
						class:row-error={!!err}
						class:clickable={!!onRowClick}
						tabindex="0"
						onkeydown={(e) => onRowKeydown(e, row)}
						onclick={() => onRowClick?.(row)}
						title={err}
					>
						{#if selectable}
							<td class="select-col">
								<Checkbox
									checked={selected.has(id)}
									ariaLabel="Select row"
									onchange={() => toggleRow(id)}
								/>
							</td>
						{/if}
						{#each visibleColumns as col (col.key)}
							{@const cErr = cellError?.(row, col.key)}
							<td
								style:text-align={alignOf(col)}
								class:numeric={col.numeric}
								class:cell-error={!!cErr}
								title={cErr ?? col.tooltip?.(row)}
							>
								{#if cell}
									{@render cell(row, col)}
								{:else}
									<span class="cell-text">{renderCell(col, row)}</span>
								{/if}
								{#if cErr}<span class="cell-err-icon" aria-label={cErr}>⚠</span>{/if}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<style>
	.scroller {
		overflow-x: auto;
		background: var(--surface-default);
		border: 1px solid var(--border-default);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-card);
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--font-size-cell);
	}
	table.touch {
		font-size: var(--font-size-cell-touch);
	}

	thead th {
		font-weight: var(--weight-header);
		color: var(--text-primary);
		text-align: left;
		padding: 0 var(--space-3);
		height: var(--row-comfortable);
		border-bottom: 2px solid var(--border-strong);
		background: var(--surface-default);
		white-space: nowrap;
		vertical-align: middle;
	}
	.sticky thead th {
		position: sticky;
		top: 0;
		z-index: var(--z-sticky-header);
	}

	tbody td {
		padding: var(--space-2) var(--space-3);
		height: var(--row-h);
		border-bottom: 1px solid var(--divider);
		vertical-align: top;
		color: var(--text-primary);
	}
	tbody tr:last-child td {
		border-bottom: 0;
	}
	td.numeric {
		font-variant-numeric: tabular-nums;
		font-feature-settings: var(--font-feature-tabular);
		white-space: nowrap;
	}

	/* Item-name style truncation: clamp to 2 lines. */
	.cell-text {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	tbody tr.clickable {
		cursor: pointer;
	}
	tbody tr:hover {
		background: var(--hover-overlay);
	}
	tbody tr.selected {
		background: var(--selected);
	}
	tbody tr.selected:hover {
		background: var(--selected-hover);
	}
	tbody tr.row-error td:first-child {
		box-shadow: inset 3px 0 0 var(--state-error);
	}

	td.cell-error {
		background: var(--state-error-subtle);
	}
	.cell-err-icon {
		color: var(--state-error);
		margin-inline-start: var(--space-1);
	}

	.select-col {
		width: var(--touch-target);
		text-align: center;
		vertical-align: middle;
	}

	.sort-btn {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		min-height: var(--touch-target);
		background: none;
		border: 0;
		font: inherit;
		font-weight: var(--weight-header);
		color: inherit;
		cursor: pointer;
		padding: 0;
	}
	.sort-ind {
		color: var(--brand-primary);
		font-size: 10px;
	}

	.empty {
		text-align: center;
		color: var(--text-secondary);
		padding: var(--space-6);
	}

	/* ── Cards ── */
	.cards {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
	.card {
		background: var(--surface-default);
		border: 1px solid var(--border-default);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-card);
		padding: var(--space-3);
	}
	.card.has-error {
		border-color: var(--state-error);
	}
	.card header {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: var(--space-2);
	}
	.card-id {
		font-weight: 600;
		flex: 1;
		min-width: 0;
	}
	.card dl {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-2) var(--space-3);
		margin: 0;
	}
	.card dt {
		font-size: var(--font-size-label);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-secondary);
	}
	.card dd {
		margin: 0;
		font-size: 14px;
	}
	.card dd.numeric {
		font-variant-numeric: tabular-nums;
	}
	.card dd.cell-error {
		color: var(--state-error);
	}
	.card-err {
		margin: var(--space-2) 0 0;
		color: var(--state-error);
		font-size: 13px;
	}
</style>
