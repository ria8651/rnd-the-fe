<script lang="ts">
	import { goto } from '$app/navigation';
	import Table from '$lib/ui/Table.svelte';
	import StatusBadge from '$lib/ui/StatusBadge.svelte';
	import type { Column } from '$lib/ui/table';
	import { auth } from '$lib/auth/auth.svelte';
	import { listStocktakes } from '$lib/stocktakes/api';
	import type { Stocktake } from '$lib/stocktakes/types';
	import { editBlockReason } from '$lib/stocktakes/rules';
	import { formatDate } from '$lib/format';

	let loading = $state(true);
	let error = $state<string | null>(null);
	let total = $state(0);
	let rows = $state<Stocktake[]>([]);

	// Load whenever the active store changes (live API via the adapter).
	$effect(() => {
		const storeId = auth.storeId;
		const controller = new AbortController();
		loading = true;
		error = null;
		listStocktakes(storeId, { perPage: 25, sortKey: 'createdDatetime', sortDir: 'desc' }, controller.signal)
			.then((page) => {
				total = page.totalCount;
				rows = page.nodes;
			})
			.catch((e) => {
				if (!controller.signal.aborted) error = e instanceof Error ? e.message : String(e);
			})
			.finally(() => {
				if (!controller.signal.aborted) loading = false;
			});
		return () => controller.abort();
	});

	const columns: Column<Stocktake>[] = [
		{ key: 'stocktakeNumber', header: 'No.', priority: 1, width: '80px', numeric: true, sortable: true, role: 'identifier', format: (r) => String(r.stocktakeNumber) },
		{ key: 'status', header: 'Status', priority: 1, width: '130px', role: 'status' },
		{ key: 'description', header: 'Description', priority: 1, format: (r) => r.description ?? '' },
		{ key: 'comment', header: 'Comment', priority: 3, format: (r) => r.comment ?? '' },
		{ key: 'createdDatetime', header: 'Created', priority: 2, width: '120px', sortable: true, format: (r) => formatDate(r.createdDatetime) },
		{ key: 'finalisedDatetime', header: 'Finalised', priority: 2, width: '120px', format: (r) => formatDate(r.finalisedDatetime) }
	];

	function open(row: Stocktake) {
		goto(`/stocktakes/${row.stocktakeNumber}`);
	}
</script>

<header class="top">
	<div>
		<h1>Stocktakes</h1>
		<p class="sub">{auth.currentStore?.name} · {total.toLocaleString()} total</p>
	</div>
</header>

{#if error}
	<div class="state error" role="alert">
		<p>Couldn't load stocktakes: {error}</p>
	</div>
{:else if loading && rows.length === 0}
	<div class="state">Loading…</div>
{:else}
	<Table
		{columns}
		{rows}
		getRowId={(r) => r.id}
		onRowClick={open}
		emptyText="No stocktakes in this store yet."
		caption="Stocktakes"
	>
		{#snippet cell(row, col)}
			{#if col.key === 'status'}
				<StatusBadge
					label={row.status === 'FINALISED' ? 'Finalised' : 'New'}
					tone={row.status === 'FINALISED' ? 'success' : 'info'}
				/>
				{#if editBlockReason(row) === 'locked'}<StatusBadge label="Locked" tone="warning" icon="🔒" />{/if}
			{:else}
				{col.format ? col.format(row) : ''}
			{/if}
		{/snippet}
	</Table>
	<p class="note">Showing the latest {rows.length}. Filters, selection, bulk delete, CSV and create arrive in Stage 5.</p>
{/if}

<style>
	.top {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: var(--space-4);
	}
	h1 {
		margin: 0;
	}
	.sub {
		margin: var(--space-1) 0 0;
		color: var(--text-secondary);
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
	.note {
		margin: var(--space-3) 0 0;
		color: var(--text-secondary);
		font-size: 13px;
	}
</style>
