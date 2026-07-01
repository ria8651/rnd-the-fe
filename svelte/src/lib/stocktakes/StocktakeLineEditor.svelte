<script lang="ts">
	/**
	 * Line editor (spec S4 / J3): add an item's batches to a stocktake. Search the
	 * catalogue for an item (excluding those already on the stocktake), then enter one
	 * or more new batches — counted packs, batch, expiry, pack size, location. Saves
	 * as inserts via the batch endpoint. (Per-batch fields beyond these and next/prev
	 * item navigation are a noted follow-up — see Stage 6 notes.)
	 */
	import Modal from '$lib/ui/Modal.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Icon from '$lib/icons/Icon.svelte';
	import NumericField from '$lib/ui/inputs/NumericField.svelte';
	import TextField from '$lib/ui/inputs/TextField.svelte';
	import DateField from '$lib/ui/inputs/DateField.svelte';
	import SelectField from '$lib/ui/inputs/SelectField.svelte';
	import { searchItems, type ItemSearchResult, type Ref } from './reference';
	import { batchStocktakeLines, type UpsertLineInput } from './api';

	let {
		open = $bindable(false),
		storeId,
		stocktakeId,
		existingItemIds = new Set<string>(),
		locations = [],
		onSaved
	}: {
		open?: boolean;
		storeId: string;
		stocktakeId: string;
		existingItemIds?: Set<string>;
		locations?: Ref[];
		onSaved?: () => void;
	} = $props();

	interface BatchRow {
		key: number;
		counted: number | null;
		batch: string;
		expiry: string | null;
		packSize: number | null;
		locationId: string | null;
	}

	let term = $state('');
	let results = $state<ItemSearchResult[]>([]);
	let searching = $state(false);
	let item = $state<ItemSearchResult | null>(null);
	let rows = $state<BatchRow[]>([]);
	let saving = $state(false);
	let error = $state<string | null>(null);
	let nextKey = 0;

	// Reset everything each time the modal opens.
	$effect(() => {
		if (open) {
			term = '';
			results = [];
			item = null;
			rows = [];
			error = null;
		}
	});

	// Debounced catalogue search while no item is chosen.
	$effect(() => {
		if (!open || item) return;
		const q = term;
		const store = storeId;
		searching = true;
		const t = setTimeout(() => {
			searchItems(store, q)
				.then((r) => (results = r.filter((i) => !existingItemIds.has(i.id))))
				.catch(() => (results = []))
				.finally(() => (searching = false));
		}, 250);
		return () => clearTimeout(t);
	});

	function chooseItem(i: ItemSearchResult) {
		item = i;
		rows = [newRow(i)];
	}

	function newRow(i: ItemSearchResult | null): BatchRow {
		return {
			key: nextKey++,
			counted: null,
			batch: '',
			expiry: null,
			packSize: i?.defaultPackSize ?? 1,
			locationId: null
		};
	}

	function addRow() {
		rows = [...rows, newRow(item)];
	}
	function removeRow(key: number) {
		rows = rows.filter((r) => r.key !== key);
	}

	const canSave = $derived(
		!!item && rows.length > 0 && rows.some((r) => r.counted != null) && !saving
	);

	async function save() {
		if (!item) return;
		saving = true;
		error = null;
		try {
			const upserts: UpsertLineInput[] = rows
				.filter((r) => r.counted != null || r.batch.trim())
				.map((r) => ({
					stocktakeId,
					itemId: item!.id,
					countedNumberOfPacks: r.counted,
					batch: r.batch.trim() || undefined,
					expiryDate: r.expiry ?? undefined,
					packSize: r.packSize ?? undefined,
					location: r.locationId ? { value: r.locationId } : undefined
				}));
			await batchStocktakeLines(storeId, { upserts });
			open = false;
			onSaved?.();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			saving = false;
		}
	}

	const locationOptions = $derived(
		locations.map((l) => ({ value: l.id, label: l.name || l.code || l.id }))
	);
</script>

<Modal bind:open title="Add item" width="720px">
	{#if !item}
		<TextField
			label="Search catalogue"
			bind:value={term}
			width="full"
			placeholder="Item code or name"
		/>
		<div class="results" role="listbox" aria-label="Search results">
			{#if searching && results.length === 0}
				<p class="hint">Searching…</p>
			{:else if results.length === 0}
				<p class="hint">{term.trim() ? 'No matching items.' : 'Type to search the catalogue.'}</p>
			{:else}
				{#each results as i (i.id)}
					<button type="button" class="result" role="option" aria-selected="false" onclick={() => chooseItem(i)}>
						<span class="code">{i.code}</span>
						<span class="name">{i.name}</span>
						{#if i.unitName}<span class="unit">{i.unitName}</span>{/if}
					</button>
				{/each}
			{/if}
		</div>
	{:else}
		<div class="chosen">
			<div>
				<span class="code">{item.code}</span>
				<strong>{item.name}</strong>
				{#if item.unitName}<span class="unit">· {item.unitName}</span>{/if}
			</div>
			<Button variant="ghost" compact onclick={() => (item = null)}>
				<Icon name="edit" size={16} /> Change item
			</Button>
		</div>

		<div class="batches">
			{#each rows as r (r.key)}
				<div class="batch-row">
					<NumericField label="Counted packs" bind:value={r.counted} min={0} width="qty" />
					<TextField label="Batch" bind:value={r.batch} width="140px" placeholder="—" />
					<DateField label="Expiry" bind:value={r.expiry} />
					<NumericField label="Pack size" bind:value={r.packSize} min={1} width="qty" />
					<SelectField
						label="Location"
						bind:value={r.locationId}
						width="180px"
						placeholder="—"
						options={locationOptions}
					/>
					<button
						type="button"
						class="remove"
						title="Remove batch"
						aria-label="Remove batch"
						disabled={rows.length === 1}
						onclick={() => removeRow(r.key)}
					>
						<Icon name="delete" size={16} />
					</button>
				</div>
			{/each}
			<Button variant="ghost" compact onclick={addRow}>
				<Icon name="plus-circle" size={16} /> Add another batch
			</Button>
		</div>
	{/if}

	{#if error}<p class="err" role="alert">⚠ {error}</p>{/if}

	{#snippet footer()}
		<Button variant="ghost" onclick={() => (open = false)}>Cancel</Button>
		<Button variant="primary" onclick={save} disabled={!canSave}>
			{saving ? 'Saving…' : 'Add to stocktake'}
		</Button>
	{/snippet}
</Modal>

<style>
	.results {
		margin-top: var(--space-3);
		max-height: 320px;
		overflow-y: auto;
		border: 1px solid var(--border-default);
		border-radius: var(--radius-control);
	}
	.hint {
		margin: 0;
		padding: var(--space-4);
		text-align: center;
		color: var(--text-secondary);
	}
	.result {
		display: flex;
		align-items: baseline;
		gap: var(--space-3);
		width: 100%;
		text-align: start;
		padding: var(--space-2) var(--space-3);
		background: none;
		border: 0;
		border-bottom: 1px solid var(--divider);
		cursor: pointer;
		color: var(--text-primary);
		font: inherit;
	}
	.result:last-child {
		border-bottom: 0;
	}
	.result:hover {
		background: var(--hover-overlay);
	}
	.code {
		font-variant-numeric: tabular-nums;
		color: var(--text-secondary);
		min-width: 88px;
	}
	.name {
		flex: 1;
	}
	.unit {
		color: var(--text-secondary);
		font-size: 13px;
	}
	.chosen {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		padding: var(--space-3);
		background: var(--surface-sunken);
		border-radius: var(--radius-control);
		margin-bottom: var(--space-4);
	}
	.chosen .code {
		margin-inline-end: var(--space-2);
	}
	.batches {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
	.batch-row {
		display: flex;
		align-items: flex-end;
		gap: var(--space-3);
		flex-wrap: wrap;
	}
	.remove {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 40px;
		height: 40px;
		border: 1px solid var(--border-default);
		border-radius: var(--radius-control);
		background: var(--surface-default);
		color: var(--state-error);
		cursor: pointer;
	}
	.remove:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.err {
		margin: var(--space-3) 0 0;
		color: var(--state-error);
	}
</style>
