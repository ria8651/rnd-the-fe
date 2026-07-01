<script lang="ts">
	/**
	 * Line editor (spec S4 / J3) — the SINGLE surface for entering stocktake-line data.
	 * The S3 detail table is read-only; all editing happens here. Two modes:
	 *   - **create** (`editItem` null): search the catalogue for an item not yet on the
	 *     stocktake, then enter one or more new batches (inserts);
	 *   - **edit** (`editItem` set): item is locked; its existing batches load as rows
	 *     (updates), and further new batches can be added (inserts).
	 *
	 * Each batch row captures counted packs, batch, expiry, pack size, location and — when
	 * the count produces an adjustment — a direction-gated reason (03 › Adjustment-reason
	 * rules). Reason/count validation is enforced here so there is a single validation path.
	 *
	 * Scope note (staged): batch/expiry/pack-size are editable for NEW batches; for existing
	 * batches they identify the row and are shown read-only (the update API takes expiry as a
	 * nullable wrapper — see api.ts). Prices, donor, item variant, VVM status, note and
	 * next/previous-item navigation are noted follow-ups.
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
	import { adjustmentDirection, reasonTypeMatchesDirection } from './rules';
	import type { ReasonOption, StocktakeLine } from './types';
	import { formatDate, formatNumber } from '$lib/format';

	/** Minimal item shape shared by catalogue results and existing-line items. */
	interface EditItem {
		id: string;
		code: string;
		name: string;
		unitName?: string | null;
		defaultPackSize?: number;
	}

	let {
		open = $bindable(false),
		storeId,
		stocktakeId,
		existingItemIds = new Set<string>(),
		locations = [],
		reasons = [],
		editItem = null,
		onSaved
	}: {
		open?: boolean;
		storeId: string;
		stocktakeId: string;
		existingItemIds?: Set<string>;
		locations?: Ref[];
		reasons?: ReasonOption[];
		/** When set, opens in edit mode for this item's existing batches. */
		editItem?: { item: EditItem; lines: StocktakeLine[] } | null;
		onSaved?: () => void;
	} = $props();

	interface BatchRow {
		key: number;
		/** Existing line id ⇒ update; absent ⇒ insert. */
		id?: string;
		snapshot: number;
		counted: number | null;
		batch: string;
		expiry: string | null;
		packSize: number | null;
		locationId: string | null;
		reasonId: string | null;
	}

	let term = $state('');
	let results = $state<ItemSearchResult[]>([]);
	let searching = $state(false);
	let item = $state<EditItem | null>(null);
	let rows = $state<BatchRow[]>([]);
	let saving = $state(false);
	let error = $state<string | null>(null);
	let nextKey = 0;

	const isEdit = $derived(!!editItem);

	// Reset each time the modal opens; edit mode seeds the item + its existing batches.
	$effect(() => {
		if (!open) return;
		error = null;
		term = '';
		results = [];
		if (editItem) {
			item = { ...editItem.item };
			rows = editItem.lines.map(toRow);
		} else {
			item = null;
			rows = [];
		}
	});

	function toRow(l: StocktakeLine): BatchRow {
		return {
			key: nextKey++,
			id: l.id,
			snapshot: l.snapshotNumberOfPacks,
			counted: l.countedNumberOfPacks ?? null,
			batch: l.batch ?? '',
			expiry: l.expiryDate ?? null,
			packSize: l.packSize,
			locationId: l.location?.id ?? null,
			reasonId: l.reasonOption?.id ?? null
		};
	}

	function newRow(): BatchRow {
		return {
			key: nextKey++,
			snapshot: 0,
			counted: null,
			batch: '',
			expiry: null,
			packSize: item?.defaultPackSize ?? 1,
			locationId: null,
			reasonId: null
		};
	}

	// Debounced catalogue search while no item is chosen (create mode only).
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
		item = { id: i.id, code: i.code, name: i.name, unitName: i.unitName, defaultPackSize: i.defaultPackSize };
		rows = [newRow()];
	}

	function addRow() {
		rows = [...rows, newRow()];
	}
	function removeRow(key: number) {
		rows = rows.filter((r) => r.key !== key);
	}

	// ── Reason gating (mirrors rules.ts, per-row) ──────────────────────────────
	function directionOf(r: BatchRow) {
		return adjustmentDirection({ countedNumberOfPacks: r.counted, snapshotNumberOfPacks: r.snapshot });
	}
	function reasonsFor(r: BatchRow) {
		const dir = directionOf(r);
		return reasons
			.filter((o) => o.isActive && reasonTypeMatchesDirection(o.type, dir))
			.map((o) => ({ value: o.id, label: o.reason }));
	}
	function needsReason(r: BatchRow): boolean {
		return directionOf(r) !== 'none' && reasonsFor(r).length > 0;
	}
	/** Per-row reason problem, or null. Only counted rows are validated. */
	function rowReasonError(r: BatchRow): 'required' | 'invalid' | null {
		if (r.counted == null) return null;
		const dir = directionOf(r);
		if (dir === 'none') return null;
		if (r.reasonId) {
			const opt = reasons.find((o) => o.id === r.reasonId);
			return opt && reasonTypeMatchesDirection(opt.type, dir) ? null : 'invalid';
		}
		return needsReason(r) ? 'required' : null;
	}
	/** When a count change flips the direction, drop a now-invalid reason. */
	function reconcileReason(r: BatchRow) {
		if (r.reasonId && !reasonsFor(r).some((o) => o.value === r.reasonId)) r.reasonId = null;
	}

	const anyReasonError = $derived(rows.some((r) => rowReasonError(r) !== null));
	const anyCounted = $derived(rows.some((r) => r.counted != null));
	const canSave = $derived(!!item && rows.length > 0 && anyCounted && !anyReasonError && !saving);

	async function save() {
		if (!item) return;
		saving = true;
		error = null;
		try {
			const upserts: UpsertLineInput[] = [];
			for (const r of rows) {
				const isNew = !r.id;
				// Skip empty new rows (nothing entered).
				if (isNew && r.counted == null && !r.batch.trim()) continue;
				if (isNew) {
					upserts.push({
						stocktakeId,
						itemId: item.id,
						countedNumberOfPacks: r.counted,
						batch: r.batch.trim() || undefined,
						expiryDate: r.expiry ?? undefined,
						packSize: r.packSize ?? undefined,
						location: r.locationId ? { value: r.locationId } : undefined,
						reasonOptionId: r.reasonId ?? undefined
					});
				} else {
					upserts.push({
						id: r.id,
						stocktakeId,
						countedNumberOfPacks: r.counted,
						location: r.locationId ? { value: r.locationId } : { value: null },
						reasonOptionId: r.reasonId ?? undefined
					});
				}
			}
			if (upserts.length) await batchStocktakeLines(storeId, { upserts });
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
	const title = $derived(isEdit ? 'Edit item lines' : 'Add item');
</script>

<Modal bind:open {title} width="860px">
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
			{#if !isEdit}
				<Button variant="ghost" compact onclick={() => (item = null)}>
					<Icon name="edit" size={16} /> Change item
				</Button>
			{/if}
		</div>

		<div class="grid" role="table" aria-label="Batches">
			<div class="row head" role="row">
				<span role="columnheader">Counted packs</span>
				<span role="columnheader">Batch</span>
				<span role="columnheader">Expiry</span>
				<span role="columnheader">Pack size</span>
				<span role="columnheader">Location</span>
				<span role="columnheader">Reason</span>
				<span role="columnheader" class="sr">Remove</span>
			</div>
			{#each rows as r (r.key)}
				{@const rerr = rowReasonError(r)}
				<div class="row" role="row">
					<NumericField
						label="Counted packs"
						hideLabel
						bind:value={r.counted}
						min={0}
						width="qty"
						onchange={() => reconcileReason(r)}
					/>

					{#if r.id}
						<span class="ro" title={r.batch || '—'}>{r.batch || '—'}</span>
						<span class="ro">{formatDate(r.expiry) || '—'}</span>
						<span class="ro num">{formatNumber(r.packSize)}</span>
					{:else}
						<TextField label="Batch" hideLabel bind:value={r.batch} width="120px" placeholder="—" />
						<DateField label="Expiry" hideLabel bind:value={r.expiry} />
						<NumericField label="Pack size" hideLabel bind:value={r.packSize} min={1} width="qty" />
					{/if}

					<SelectField
						label="Location"
						hideLabel
						bind:value={r.locationId}
						width="160px"
						placeholder="—"
						options={locationOptions}
					/>

					{#if directionOf(r) === 'none'}
						<span class="ro muted">No adjustment</span>
					{:else}
						<SelectField
							label="Reason"
							hideLabel
							value={r.reasonId}
							width="180px"
							placeholder={rerr === 'required' ? 'Reason required' : 'Select reason…'}
							error={rerr ? ' ' : undefined}
							options={reasonsFor(r)}
							onchange={(v) => (r.reasonId = v as string | null)}
						/>
					{/if}

					<button
						type="button"
						class="remove"
						title="Remove batch"
						aria-label="Remove batch"
						disabled={rows.length === 1 || !!r.id}
						onclick={() => removeRow(r.key)}
					>
						<Icon name="delete" size={16} />
					</button>
				</div>
				{#if rerr}
					<p class="rowerr" role="alert">
						{rerr === 'required'
							? 'A reason is required for this adjustment.'
							: "The selected reason doesn't match the adjustment direction."}
					</p>
				{/if}
			{/each}
		</div>

		<Button variant="ghost" compact onclick={addRow}>
			<Icon name="plus-circle" size={16} /> Add another batch
		</Button>
	{/if}

	{#if error}<p class="err" role="alert">⚠ {error}</p>{/if}

	{#snippet footer()}
		<Button variant="ghost" onclick={() => (open = false)}>Cancel</Button>
		<Button variant="primary" onclick={save} disabled={!canSave}>
			{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add to stocktake'}
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
	.grid {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin-bottom: var(--space-3);
	}
	.row {
		display: grid;
		grid-template-columns: 90px 120px 150px 90px 160px 180px 40px;
		align-items: center;
		gap: var(--space-3);
	}
	.row.head {
		font-size: var(--font-size-label);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-secondary);
	}
	.ro {
		font-size: 14px;
		color: var(--text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.ro.num {
		font-variant-numeric: tabular-nums;
		text-align: end;
	}
	.ro.muted {
		color: var(--text-secondary);
		font-size: 13px;
	}
	.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
	}
	.rowerr {
		margin: 0 0 var(--space-2);
		color: var(--state-error);
		font-size: 13px;
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
	@media (max-width: 760px) {
		.row,
		.row.head {
			grid-template-columns: 1fr 1fr;
		}
		.row.head {
			display: none;
		}
	}
</style>
