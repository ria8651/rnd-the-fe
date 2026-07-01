<script lang="ts">
	import { goto } from '$app/navigation';
	import Table from '$lib/ui/Table.svelte';
	import StatusBadge from '$lib/ui/StatusBadge.svelte';
	import Button from '$lib/ui/Button.svelte';
	import SelectField from '$lib/ui/inputs/SelectField.svelte';
	import Modal from '$lib/ui/Modal.svelte';
	import Icon from '$lib/icons/Icon.svelte';
	import type { Column, SortState } from '$lib/ui/table';
	import { auth } from '$lib/auth/auth.svelte';
	import { listStocktakes, deleteStocktakes } from '$lib/stocktakes/api';
	import type { Stocktake, StocktakeStatus, StocktakeListParams } from '$lib/stocktakes/types';
	import { editBlockReason } from '$lib/stocktakes/rules';
	import { formatDate } from '$lib/format';
	import StocktakeCreateModal from '$lib/stocktakes/StocktakeCreateModal.svelte';

	const PER_PAGE = 25;

	let loading = $state(true);
	let error = $state<string | null>(null);
	let total = $state(0);
	let rows = $state<Stocktake[]>([]);
	let page = $state(0);
	let statusFilter = $state<StocktakeStatus | null>(null);
	let sort = $state<SortState>({ key: 'createdDatetime', dir: 'desc' });
	let selected = $state(new Set<string>());

	let showCreate = $state(false);
	let confirmingDelete = $state(false);
	let deleting = $state(false);

	const pageCount = $derived(Math.max(1, Math.ceil(total / PER_PAGE)));

	// Reload on any server-driven parameter change.
	$effect(() => {
		const params: StocktakeListParams = {
			page,
			perPage: PER_PAGE,
			sortKey: sort.key as StocktakeListParams['sortKey'],
			sortDir: sort.dir,
			status: statusFilter ?? undefined
		};
		const storeId = auth.storeId;
		const controller = new AbortController();
		loading = true;
		error = null;
		listStocktakes(storeId, params, controller.signal)
			.then((p) => {
				total = p.totalCount;
				rows = p.nodes;
			})
			.catch((e) => {
				if (!controller.signal.aborted) error = e instanceof Error ? e.message : String(e);
			})
			.finally(() => {
				if (!controller.signal.aborted) loading = false;
			});
		return () => controller.abort();
	});

	// Reset paging/selection when the filter or store changes.
	function onFilterChange() {
		page = 0;
		selected = new Set();
	}
	$effect(() => {
		auth.storeId; // track
		page = 0;
		selected = new Set();
	});

	const columns: Column<Stocktake>[] = [
		{ key: 'stocktakeNumber', header: 'No.', priority: 1, width: '80px', numeric: true, sortable: true, role: 'identifier', format: (r) => String(r.stocktakeNumber) },
		{ key: 'status', header: 'Status', priority: 1, width: '140px', sortable: true, role: 'status' },
		{ key: 'description', header: 'Description', priority: 1, sortable: true, format: (r) => r.description ?? '' },
		{ key: 'comment', header: 'Comment', priority: 3, format: (r) => r.comment ?? '' },
		{ key: 'createdDatetime', header: 'Created', priority: 2, width: '120px', sortable: true, format: (r) => formatDate(r.createdDatetime) },
		{ key: 'finalisedDatetime', header: 'Finalised', priority: 2, width: '120px', sortable: true, format: (r) => formatDate(r.finalisedDatetime) }
	];

	function open(row: Stocktake) {
		goto(`/stocktakes/${row.stocktakeNumber}`);
	}

	async function doDelete() {
		deleting = true;
		try {
			await deleteStocktakes(auth.storeId, [...selected]);
			selected = new Set();
			confirmingDelete = false;
			await reload();
		} finally {
			deleting = false;
		}
	}

	async function reload() {
		loading = true;
		try {
			const p = await listStocktakes(auth.storeId, {
				page,
				perPage: PER_PAGE,
				sortKey: sort.key as StocktakeListParams['sortKey'],
				sortDir: sort.dir,
				status: statusFilter ?? undefined
			});
			total = p.totalCount;
			rows = p.nodes;
		} finally {
			loading = false;
		}
	}

	function exportCsv() {
		const header = ['No.', 'Status', 'Description', 'Comment', 'Created', 'Finalised', 'Locked'];
		const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
		const lines = rows.map((r) =>
			[r.stocktakeNumber, r.status, r.description, r.comment, formatDate(r.createdDatetime), formatDate(r.finalisedDatetime), r.isLocked ? 'Yes' : 'No']
				.map(esc)
				.join(',')
		);
		const csv = [header.map(esc).join(','), ...lines].join('\n');
		const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
		const a = document.createElement('a');
		a.href = url;
		a.download = `stocktakes-${auth.currentStore?.code ?? 'export'}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function onCreated(n: number) {
		goto(`/stocktakes/${n}`);
	}
</script>

<header class="top">
	<div>
		<h1>Stocktakes</h1>
		<p class="sub">{auth.currentStore?.name} · {total.toLocaleString()} total</p>
	</div>
	<div class="actions">
		<Button variant="secondary" onclick={exportCsv} title="Export current page to CSV">
			<Icon name="download" size={18} /> Export
		</Button>
		<Button variant="primary" onclick={() => (showCreate = true)}>
			<Icon name="plus-circle" size={18} /> New stocktake
		</Button>
	</div>
</header>

<div class="toolbar">
	<SelectField
		label="Status"
		bind:value={statusFilter}
		width="200px"
		compact
		placeholder="All"
		onchange={onFilterChange}
		options={[
			{ value: 'NEW', label: 'New' },
			{ value: 'FINALISED', label: 'Finalised' }
		]}
	/>
	{#if selected.size > 0}
		<div class="selection">
			<span>{selected.size} selected</span>
			<Button variant="danger" compact onclick={() => (confirmingDelete = true)}>
				<Icon name="delete" size={16} /> Delete
			</Button>
		</div>
	{/if}
</div>

{#if error}
	<div class="state error" role="alert">Couldn't load stocktakes: {error}</div>
{:else if loading && rows.length === 0}
	<div class="state">Loading…</div>
{:else}
	<Table
		{columns}
		{rows}
		getRowId={(r) => r.id}
		selectable
		bind:selected
		bind:sort
		clientSort={false}
		onsort={() => (page = 0)}
		onRowClick={open}
		emptyText={statusFilter ? 'No stocktakes match this filter.' : 'No stocktakes in this store yet.'}
		caption="Stocktakes"
	>
		{#snippet cell(row, col)}
			{#if col.key === 'status'}
				<span class="status-cell">
					<StatusBadge
						label={row.status === 'FINALISED' ? 'Finalised' : 'New'}
						tone={row.status === 'FINALISED' ? 'success' : 'info'}
					/>
					{#if editBlockReason(row) === 'locked'}<Icon name="alert" size={16} label="Locked" />{/if}
				</span>
			{:else}
				{col.format ? col.format(row) : ''}
			{/if}
		{/snippet}
	</Table>

	<div class="pager">
		<Button variant="ghost" compact disabled={page === 0} onclick={() => (page = Math.max(0, page - 1))}>
			‹ Prev
		</Button>
		<span class="page-info">Page {page + 1} of {pageCount}</span>
		<Button variant="ghost" compact disabled={page + 1 >= pageCount} onclick={() => (page = page + 1)}>
			Next ›
		</Button>
	</div>
{/if}

<StocktakeCreateModal bind:open={showCreate} {onCreated} />

<Modal bind:open={confirmingDelete} title="Delete stocktakes?" width="420px">
	Delete {selected.size} selected stocktake{selected.size === 1 ? '' : 's'}? This can't be undone.
	{#snippet footer()}
		<Button variant="ghost" onclick={() => (confirmingDelete = false)}>Cancel</Button>
		<Button variant="danger" onclick={doDelete} disabled={deleting}>
			{deleting ? 'Deleting…' : 'Delete'}
		</Button>
	{/snippet}
</Modal>

<style>
	.top {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--space-4);
		margin-bottom: var(--space-4);
	}
	h1 {
		margin: 0;
	}
	.sub {
		margin: var(--space-1) 0 0;
		color: var(--text-secondary);
	}
	.actions {
		display: flex;
		gap: var(--space-2);
	}
	.toolbar {
		display: flex;
		align-items: flex-end;
		gap: var(--space-4);
		margin-bottom: var(--space-3);
	}
	.selection {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		margin-bottom: 2px;
		font-size: 14px;
		color: var(--text-secondary);
	}
	.status-cell {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		color: var(--state-warning);
	}
	.state {
		padding: var(--space-6);
		text-align: center;
		color: var(--text-secondary);
		background: var(--surface-default);
		border: 1px solid var(--border-default);
		border-radius: var(--radius-card);
	}
	.state.error {
		color: var(--state-error);
		border-color: var(--state-error);
	}
	.pager {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-4);
		margin-top: var(--space-4);
	}
	.page-info {
		font-size: 13px;
		color: var(--text-secondary);
	}
</style>
