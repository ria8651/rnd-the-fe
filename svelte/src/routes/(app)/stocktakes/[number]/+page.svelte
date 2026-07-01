<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import Table from '$lib/ui/Table.svelte';
	import Button from '$lib/ui/Button.svelte';
	import StatusBadge from '$lib/ui/StatusBadge.svelte';
	import Modal from '$lib/ui/Modal.svelte';
	import Icon from '$lib/icons/Icon.svelte';
	import TextField from '$lib/ui/inputs/TextField.svelte';
	import NumericField from '$lib/ui/inputs/NumericField.svelte';
	import SelectField from '$lib/ui/inputs/SelectField.svelte';
	import type { Column } from '$lib/ui/table';
	import { auth } from '$lib/auth/auth.svelte';
	import {
		getStocktakeByNumber,
		updateStocktake,
		batchStocktakeLines
	} from '$lib/stocktakes/api';
	import { listReasonOptions, listLocations, type Ref } from '$lib/stocktakes/reference';
	import {
		isEditable,
		editBlockReason,
		packDifference,
		adjustmentDirection,
		reasonError,
		reasonTypeMatchesDirection,
		finaliseCheck,
		errorSurface
	} from '$lib/stocktakes/rules';
	import type { Stocktake, StocktakeLine, ReasonOption } from '$lib/stocktakes/types';
	import { formatDate, formatDelta, formatNumber } from '$lib/format';
	import StocktakeLineEditor from '$lib/stocktakes/StocktakeLineEditor.svelte';

	const number = $derived(Number(page.params.number));

	let loading = $state(true);
	let loadError = $state<string | null>(null);
	let header = $state<Stocktake | null>(null);
	let draft = $state<StocktakeLine[]>([]);
	let reasons = $state<ReasonOption[]>([]);
	let locations = $state<Ref[]>([]);

	// Editable header fields (mirrored so we can detect changes).
	let descDraft = $state('');
	let commentDraft = $state('');

	// Dirty tracking for lines: id → serialized editable fields at load.
	let original = new Map<string, string>();
	let filter = $state('');
	let selected = $state(new Set<string>());

	// UI state.
	let showAddItem = $state(false);
	let confirmingFinalise = $state(false);
	let confirmingReduce = $state(false);
	let confirmingDeleteLines = $state(false);
	let changingLocation = $state(false);
	let bulkLocationId = $state<string | null>(null);
	let busy = $state(false);
	let banner = $state<string | null>(null);
	let notice = $state<string | null>(null);
	// Per-line finalise errors (set after a finalise attempt): id → codes.
	let lineErrors = $state<Record<string, string[]>>({});

	const editable = $derived(header ? isEditable(header) : false);
	const blockReason = $derived(header ? editBlockReason(header) : null);

	function serialize(l: StocktakeLine): string {
		return JSON.stringify({
			c: l.countedNumberOfPacks ?? null,
			r: l.reasonOption?.id ?? null
		});
	}

	const dirtyIds = $derived(
		new Set(draft.filter((l) => original.get(l.id) !== serialize(l)).map((l) => l.id))
	);
	const hasLineChanges = $derived(dirtyIds.size > 0);
	const hasHeaderChanges = $derived(
		!!header &&
			(descDraft !== (header.description ?? '') || commentDraft !== (header.comment ?? ''))
	);

	const visibleLines = $derived.by(() => {
		const q = filter.trim().toLowerCase();
		if (!q) return draft;
		return draft.filter(
			(l) =>
				l.itemName?.toLowerCase().includes(q) ||
				l.item?.code?.toLowerCase().includes(q) ||
				l.batch?.toLowerCase().includes(q)
		);
	});

	const existingItemIds = $derived(new Set(draft.map((l) => l.itemId)));

	async function load() {
		loading = true;
		loadError = null;
		banner = null;
		lineErrors = {};
		selected = new Set();
		const storeId = auth.storeId;
		try {
			const [s, r, locs] = await Promise.all([
				getStocktakeByNumber(storeId, number),
				reasons.length ? Promise.resolve(reasons) : listReasonOptions(),
				locations.length ? Promise.resolve(locations) : listLocations(storeId)
			]);
			reasons = r;
			locations = locs;
			if (!s) {
				loadError = `Stocktake #${number} was not found in this store.`;
				header = null;
				return;
			}
			header = { ...s };
			draft = structuredClone(s.lines);
			original = new Map(draft.map((l) => [l.id, serialize(l)]));
			descDraft = s.description ?? '';
			commentDraft = s.comment ?? '';
		} catch (e) {
			loadError = e instanceof Error ? e.message : String(e);
		} finally {
			loading = false;
		}
	}

	// (Re)load when the number or store changes.
	$effect(() => {
		number;
		auth.storeId;
		load();
	});

	// ── Line editing helpers ──────────────────────────────────────────────────
	function dirOf(l: StocktakeLine) {
		return adjustmentDirection(l);
	}
	function reasonsFor(l: StocktakeLine) {
		const dir = dirOf(l);
		return reasons
			.filter((r) => r.isActive && reasonTypeMatchesDirection(r.type, dir))
			.map((r) => ({ value: r.id, label: r.reason }));
	}
	function setReason(l: StocktakeLine, id: string | null) {
		l.reasonOption = id ? (reasons.find((r) => r.id === id) ?? null) : null;
	}

	function cellError(row: StocktakeLine, key: string): string | undefined {
		if (key === 'reason') {
			const re = reasonError(row, reasons);
			if (re === 'AdjustmentReasonNotProvided') return 'A reason is required for this adjustment.';
			if (re === 'AdjustmentReasonNotValid') return "Reason doesn't match the adjustment direction.";
		}
		const codes = lineErrors[row.id];
		if (!codes) return undefined;
		if (key === 'countedNumberOfPacks' && codes.includes('reduceBelowZero'))
			return 'Would reduce stock below zero.';
		if (key === 'snapshotNumberOfPacks' && codes.includes('snapshotMismatch'))
			return 'Snapshot differs from current stock — reload before finalising.';
		return undefined;
	}

	// ── Header actions ──────────────────────────────────────────────────────────
	async function saveHeader() {
		if (!header) return;
		busy = true;
		banner = null;
		try {
			const res = await updateStocktake(auth.storeId, {
				id: header.id,
				description: descDraft,
				comment: commentDraft
			});
			if (!res.ok) banner = `Couldn't save details (${res.errorType}).`;
			else header = { ...header, description: descDraft, comment: commentDraft };
		} finally {
			busy = false;
		}
	}

	async function toggleLock() {
		if (!header) return;
		busy = true;
		banner = null;
		try {
			const res = await updateStocktake(auth.storeId, { id: header.id, isLocked: !header.isLocked });
			if (!res.ok) banner = `Couldn't change the lock (${res.errorType}).`;
			else header = { ...header, isLocked: !header.isLocked };
		} finally {
			busy = false;
		}
	}

	// ── Line save ─────────────────────────────────────────────────────────────
	async function saveLines() {
		if (!header || !hasLineChanges) return;
		busy = true;
		banner = null;
		try {
			const upserts = draft
				.filter((l) => dirtyIds.has(l.id))
				.map((l) => ({
					id: l.id,
					stocktakeId: header!.id,
					countedNumberOfPacks: l.countedNumberOfPacks,
					reasonOptionId: l.reasonOption?.id
				}));
			await batchStocktakeLines(auth.storeId, { upserts });
			await load();
		} catch (e) {
			banner = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}

	// ── Bulk line actions (J5) ──────────────────────────────────────────────────
	async function reduceToZero() {
		if (!header) return;
		busy = true;
		try {
			const upserts = [...selected].map((id) => ({
				id,
				stocktakeId: header!.id,
				countedNumberOfPacks: 0
			}));
			await batchStocktakeLines(auth.storeId, { upserts });
			confirmingReduce = false;
			await load();
		} finally {
			busy = false;
		}
	}

	async function changeLocation() {
		if (!header) return;
		busy = true;
		try {
			const upserts = [...selected].map((id) => ({
				id,
				stocktakeId: header!.id,
				location: { value: bulkLocationId }
			}));
			await batchStocktakeLines(auth.storeId, { upserts });
			changingLocation = false;
			bulkLocationId = null;
			await load();
		} finally {
			busy = false;
		}
	}

	async function deleteLines() {
		if (!header) return;
		busy = true;
		try {
			await batchStocktakeLines(auth.storeId, { deleteIds: [...selected] });
			confirmingDeleteLines = false;
			await load();
		} finally {
			busy = false;
		}
	}

	// ── Finalise (S5) ───────────────────────────────────────────────────────────
	function attemptFinalise() {
		if (!header) return;
		banner = null;
		notice = null;
		const check = finaliseCheck(header, draft, reasons);
		lineErrors = check.lineErrors;
		if (check.blockers.includes('notEditable')) {
			banner = 'This stocktake can no longer be edited.';
			return;
		}
		if (check.blockers.includes('noCountedLines')) {
			notice = 'Count at least one line before finalising.';
			return;
		}
		if (Object.keys(check.lineErrors).length > 0) {
			banner = 'Some lines need attention before finalising — see the highlighted cells.';
			return;
		}
		confirmingFinalise = true;
	}

	async function doFinalise() {
		if (!header) return;
		busy = true;
		banner = null;
		try {
			if (hasLineChanges) {
				const upserts = draft
					.filter((l) => dirtyIds.has(l.id))
					.map((l) => ({
						id: l.id,
						stocktakeId: header!.id,
						countedNumberOfPacks: l.countedNumberOfPacks,
						reasonOptionId: l.reasonOption?.id
					}));
				await batchStocktakeLines(auth.storeId, { upserts });
			}
			const res = await updateStocktake(auth.storeId, { id: header.id, status: 'FINALISED' });
			confirmingFinalise = false;
			if (!res.ok) {
				const surface = errorSurface(res.errorType);
				const msg = `Finalise failed: ${res.errorType}.`;
				if (surface === 'toast' || surface === 'line') notice = msg;
				else banner = msg;
				await load(); // resync in case the server moved on
				return;
			}
			await load();
		} catch (e) {
			banner = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}

	// ── Columns ──────────────────────────────────────────────────────────────────
	const columns: Column<StocktakeLine>[] = [
		{ key: 'code', header: 'Code', priority: 1, width: '110px', role: 'identifier', accessor: (r) => r.item?.code ?? '', tooltip: (r) => r.item?.code },
		{ key: 'itemName', header: 'Item', priority: 1, accessor: (r) => r.itemName, tooltip: (r) => r.itemName },
		{ key: 'batch', header: 'Batch', priority: 3, width: '110px', accessor: (r) => r.batch ?? '' },
		{ key: 'expiryDate', header: 'Expiry', priority: 2, width: '110px', accessor: (r) => r.expiryDate ?? '', format: (r) => formatDate(r.expiryDate) },
		{ key: 'location', header: 'Location', priority: 3, width: '120px', accessor: (r) => r.location?.name ?? r.location?.code ?? '' },
		{ key: 'packSize', header: 'Pack size', priority: 2, width: '90px', numeric: true, accessor: (r) => r.packSize, format: (r) => formatNumber(r.packSize) },
		{ key: 'snapshotNumberOfPacks', header: 'Snapshot', priority: 1, width: '100px', numeric: true, accessor: (r) => r.snapshotNumberOfPacks, format: (r) => formatNumber(r.snapshotNumberOfPacks) },
		{ key: 'countedNumberOfPacks', header: 'Counted', priority: 1, width: '120px', numeric: true, accessor: (r) => r.countedNumberOfPacks },
		{ key: 'difference', header: 'Difference', priority: 1, width: '110px', numeric: true, accessor: (r) => packDifference(r), format: (r) => (r.countedNumberOfPacks == null ? '' : formatDelta(packDifference(r))) },
		{ key: 'reason', header: 'Reason', priority: 2, width: '200px', accessor: (r) => r.reasonOption?.reason ?? '' },
		{ key: 'comment', header: 'Comment', priority: 3, accessor: (r) => r.comment ?? '' }
	];

	const countedCount = $derived(draft.filter((l) => l.countedNumberOfPacks != null).length);
</script>

<a class="back" href="/stocktakes"><Icon name="arrow-left" size={16} /> All stocktakes</a>

{#if loading && !header}
	<div class="state">Loading…</div>
{:else if loadError}
	<div class="state error" role="alert">{loadError}</div>
{:else if header}
	<header class="top">
		<div class="title">
			<h1>Stocktake #{header.stocktakeNumber}</h1>
			<StatusBadge
				label={header.status === 'FINALISED' ? 'Finalised' : 'New'}
				tone={header.status === 'FINALISED' ? 'success' : 'info'}
			/>
			{#if header.isLocked}<StatusBadge label="Locked" tone="warning" />{/if}
		</div>
		<div class="actions">
			{#if editable}
				<Button variant="secondary" onclick={() => (showAddItem = true)} disabled={busy}>
					<Icon name="plus-circle" size={18} /> Add item
				</Button>
			{/if}
			<!-- No lock glyph in the icon set (see Stage 6 spec notes); text-only for clarity. -->
			<Button variant="secondary" onclick={toggleLock} disabled={busy || header.status === 'FINALISED'}>
				{header.isLocked ? 'Unlock' : 'Lock'}
			</Button>
			{#if editable}
				<Button variant="primary" onclick={attemptFinalise} disabled={busy || countedCount === 0}>
					<Icon name="check" size={18} /> Finalise
				</Button>
			{/if}
		</div>
	</header>

	{#if blockReason}
		<div class="info-banner" role="status">
			<Icon name="info" size={18} />
			{#if blockReason === 'finalised'}
				This stocktake is finalised and read-only. Inventory adjustments have been applied.
			{:else}
				This stocktake is locked. Unlock it to make changes.
			{/if}
		</div>
	{/if}

	{#if banner}<div class="info-banner error" role="alert"><Icon name="alert" size={18} /> {banner}</div>{/if}
	{#if notice}<div class="info-banner" role="status"><Icon name="info" size={18} /> {notice}</div>{/if}

	<!-- Header / attribution region -->
	<section class="meta">
		<div class="meta-fields">
			<TextField label="Description" bind:value={descDraft} width="full" disabled={!editable} placeholder="—" />
			<TextField label="Comment" bind:value={commentDraft} width="full" disabled={!editable} placeholder="—" />
		</div>
		<dl class="attribution">
			<div><dt>Created</dt><dd>{formatDate(header.createdDatetime)}</dd></div>
			<div><dt>Stocktake date</dt><dd>{formatDate(header.stocktakeDate) || '—'}</dd></div>
			<div><dt>Counted by</dt><dd>{header.countedBy || '—'}</dd></div>
			<div><dt>Verified by</dt><dd>{header.verifiedBy || '—'}</dd></div>
			{#if header.finalisedDatetime}<div><dt>Finalised</dt><dd>{formatDate(header.finalisedDatetime)}</dd></div>{/if}
			<div><dt>Lines</dt><dd>{draft.length} · {countedCount} counted</dd></div>
		</dl>
		{#if editable && hasHeaderChanges}
			<div class="meta-save">
				<Button variant="secondary" compact onclick={saveHeader} disabled={busy}>Save details</Button>
			</div>
		{/if}
	</section>

	<!-- Line toolbar -->
	<div class="toolbar">
		<TextField bind:value={filter} width="280px" compact placeholder="Filter items…" label="Filter" />
		<div class="spacer"></div>
		{#if editable && hasLineChanges}
			<span class="dirty">{dirtyIds.size} unsaved</span>
			<Button variant="primary" compact onclick={saveLines} disabled={busy}>Save changes</Button>
		{/if}
	</div>

	{#if editable && selected.size > 0}
		<div class="bulk">
			<span>{selected.size} selected</span>
			<Button variant="secondary" compact onclick={() => (confirmingReduce = true)}>Reduce to zero</Button>
			<Button variant="secondary" compact onclick={() => (changingLocation = true)}>Change location</Button>
			<Button variant="danger" compact onclick={() => (confirmingDeleteLines = true)}>
				<Icon name="delete" size={16} /> Delete
			</Button>
		</div>
	{/if}

	<Table
		{columns}
		rows={visibleLines}
		getRowId={(r) => r.id}
		selectable={editable}
		bind:selected
		{cellError}
		emptyText={filter ? 'No lines match this filter.' : 'No lines on this stocktake yet.'}
		caption="Stocktake lines"
	>
		{#snippet cell(row, col)}
			{#if col.key === 'countedNumberOfPacks'}
				{#if editable}
					<span class="edit-cell" role="presentation" onkeydown={(e) => e.stopPropagation()}>
						<NumericField bind:value={row.countedNumberOfPacks} min={0} compact width="90px" />
					</span>
				{:else}
					{row.countedNumberOfPacks == null ? '—' : formatNumber(row.countedNumberOfPacks)}
				{/if}
			{:else if col.key === 'reason'}
				{#if editable && dirOf(row) !== 'none'}
					<span class="edit-cell" role="presentation" onkeydown={(e) => e.stopPropagation()}>
						<SelectField
							value={row.reasonOption?.id ?? null}
							options={reasonsFor(row)}
							compact
							width="180px"
							placeholder="Select reason…"
							onchange={(id) => setReason(row, id as string | null)}
						/>
					</span>
				{:else}
					{row.reasonOption?.reason ?? ''}
				{/if}
			{:else if col.key === 'difference'}
				{row.countedNumberOfPacks == null ? '' : formatDelta(packDifference(row))}
			{:else}
				{col.format ? col.format(row) : (col.accessor ? String(col.accessor(row) ?? '') : '')}
			{/if}
		{/snippet}
	</Table>
{/if}

<StocktakeLineEditor
	bind:open={showAddItem}
	storeId={auth.storeId}
	stocktakeId={header?.id ?? ''}
	{existingItemIds}
	{locations}
	onSaved={load}
/>

<Modal bind:open={confirmingFinalise} title="Finalise stocktake?" width="440px">
	Finalising applies the counted differences as inventory adjustments and makes this stocktake
	read-only. This can't be undone.
	{#snippet footer()}
		<Button variant="ghost" onclick={() => (confirmingFinalise = false)}>Cancel</Button>
		<Button variant="primary" onclick={doFinalise} disabled={busy}>
			{busy ? 'Finalising…' : 'Finalise'}
		</Button>
	{/snippet}
</Modal>

<Modal bind:open={confirmingReduce} title="Reduce to zero?" width="420px">
	Set counted packs to 0 for {selected.size} selected line{selected.size === 1 ? '' : 's'}?
	{#snippet footer()}
		<Button variant="ghost" onclick={() => (confirmingReduce = false)}>Cancel</Button>
		<Button variant="primary" onclick={reduceToZero} disabled={busy}>Reduce to zero</Button>
	{/snippet}
</Modal>

<Modal bind:open={changingLocation} title="Change location" width="420px">
	Set the location for {selected.size} selected line{selected.size === 1 ? '' : 's'}.
	<div class="loc-picker">
		<SelectField
			label="Location"
			bind:value={bulkLocationId}
			width="full"
			placeholder="No location"
			options={locations.map((l) => ({ value: l.id, label: l.name || l.code || l.id }))}
		/>
	</div>
	{#snippet footer()}
		<Button variant="ghost" onclick={() => (changingLocation = false)}>Cancel</Button>
		<Button variant="primary" onclick={changeLocation} disabled={busy}>Apply</Button>
	{/snippet}
</Modal>

<Modal bind:open={confirmingDeleteLines} title="Delete lines?" width="420px">
	Delete {selected.size} selected line{selected.size === 1 ? '' : 's'}? This can't be undone.
	{#snippet footer()}
		<Button variant="ghost" onclick={() => (confirmingDeleteLines = false)}>Cancel</Button>
		<Button variant="danger" onclick={deleteLines} disabled={busy}>Delete</Button>
	{/snippet}
</Modal>

<style>
	.back {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		color: var(--text-secondary);
		font-size: 14px;
		margin-bottom: var(--space-3);
	}
	.top {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--space-4);
		margin-bottom: var(--space-4);
	}
	.title {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}
	h1 {
		margin: 0;
	}
	.actions {
		display: flex;
		gap: var(--space-2);
		flex-wrap: wrap;
	}
	.info-banner {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-3);
		border-radius: var(--radius-control);
		background: var(--surface-sunken);
		color: var(--text-secondary);
		margin-bottom: var(--space-3);
	}
	.info-banner.error {
		background: var(--state-error-subtle);
		color: var(--state-error);
	}
	.meta {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: var(--space-4);
		padding: var(--space-4);
		background: var(--surface-default);
		border: 1px solid var(--border-default);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-card);
		margin-bottom: var(--space-4);
	}
	.meta-fields {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
	.attribution {
		display: grid;
		grid-template-columns: repeat(2, auto);
		gap: var(--space-2) var(--space-5);
		margin: 0;
		align-content: start;
	}
	.attribution dt {
		font-size: var(--font-size-label);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-secondary);
	}
	.attribution dd {
		margin: 0 0 var(--space-2);
		font-size: 14px;
	}
	.meta-save {
		grid-column: 1 / -1;
		display: flex;
		justify-content: flex-end;
	}
	.toolbar {
		display: flex;
		align-items: flex-end;
		gap: var(--space-3);
		margin-bottom: var(--space-3);
	}
	.spacer {
		flex: 1;
	}
	.dirty {
		font-size: 13px;
		color: var(--text-secondary);
	}
	.bulk {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: var(--space-3);
		font-size: 14px;
		color: var(--text-secondary);
	}
	.edit-cell {
		display: inline-flex;
	}
	.loc-picker {
		margin-top: var(--space-3);
	}
	.state {
		padding: var(--space-6);
		text-align: center;
		color: var(--text-secondary);
	}
	.state.error {
		color: var(--state-error);
	}
	@media (max-width: 700px) {
		.meta {
			grid-template-columns: 1fr;
		}
	}
</style>
