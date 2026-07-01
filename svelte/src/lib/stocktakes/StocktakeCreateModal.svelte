<script lang="ts">
	import Modal from '$lib/ui/Modal.svelte';
	import Button from '$lib/ui/Button.svelte';
	import TextField from '$lib/ui/inputs/TextField.svelte';
	import SelectField from '$lib/ui/inputs/SelectField.svelte';
	import DateField from '$lib/ui/inputs/DateField.svelte';
	import Toggle from '$lib/ui/inputs/Toggle.svelte';
	import { auth } from '$lib/auth/auth.svelte';
	import { insertStocktake } from './api';
	import { listLocations, listMasterLists, estimateLineCount, type Ref } from './reference';
	import type { CreateMode } from './types';

	let { open = $bindable(false), onCreated }: { open?: boolean; onCreated?: (n: number) => void } =
		$props();

	type Mode = Exclude<CreateMode, 'initial'>;
	let mode = $state<Mode>('full');
	let description = $state('');
	// Full
	let includeAllItems = $state(false);
	// Filtered
	let masterListId = $state<string | null>(null);
	let locationId = $state<string | null>(null);
	let expiresBefore = $state<string | null>(null);
	let includeAllMasterListItems = $state(false);

	let locations = $state<Ref[]>([]);
	let masterLists = $state<(Ref & { linesCount: number })[]>([]);
	let estimate = $state<number | null>(null);
	let estimating = $state(false);
	let saving = $state(false);
	let error = $state<string | null>(null);

	// Load reference data when the modal opens.
	$effect(() => {
		if (!open) return;
		const storeId = auth.storeId;
		listLocations(storeId).then((l) => (locations = l)).catch(() => {});
		listMasterLists(storeId).then((m) => (masterLists = m)).catch(() => {});
	});

	// Switching mode resets the other modes' inputs (spec S2).
	function setMode(m: Mode) {
		mode = m;
		includeAllItems = false;
		masterListId = null;
		locationId = null;
		expiresBefore = null;
		includeAllMasterListItems = false;
	}

	// Recompute the estimate as inputs change.
	$effect(() => {
		if (!open) return;
		const params = {
			mode,
			isAllItemsStocktake: includeAllItems,
			masterListId: masterListId ?? undefined,
			locationId: locationId ?? undefined,
			expiresBefore: expiresBefore ?? undefined,
			includeAllMasterListItems
		};
		const storeId = auth.storeId;
		const ml = masterLists;
		estimating = true;
		estimateLineCount(storeId, params, ml)
			.then((n) => (estimate = n))
			.finally(() => (estimating = false));
	});

	async function confirm() {
		saving = true;
		error = null;
		try {
			const input =
				mode === 'blank'
					? { createBlankStocktake: true, description: description || undefined }
					: mode === 'full'
						? { isAllItemsStocktake: includeAllItems || undefined, description: description || undefined }
						: {
								masterListId: masterListId ?? undefined,
								locationId: locationId ?? undefined,
								expiresBefore: expiresBefore ?? undefined,
								includeAllMasterListItems: includeAllMasterListItems || undefined,
								description: description || undefined
							};
			const { stocktakeNumber } = await insertStocktake(auth.storeId, input);
			open = false;
			onCreated?.(stocktakeNumber);
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			saving = false;
		}
	}

	const modes: { value: Mode; label: string; hint: string }[] = [
		{ value: 'full', label: 'Full', hint: 'Count everything on hand.' },
		{ value: 'filtered', label: 'Filtered', hint: 'Count a subset by list, location or expiry.' },
		{ value: 'blank', label: 'Blank', hint: "I'll add items myself." }
	];
</script>

<Modal bind:open title="New stocktake" width="560px">
	<div class="modes" role="radiogroup" aria-label="Creation mode">
		{#each modes as m (m.value)}
			<button
				type="button"
				role="radio"
				aria-checked={mode === m.value}
				class="mode"
				class:active={mode === m.value}
				onclick={() => setMode(m.value)}
			>
				<span class="mode-label">{m.label}</span>
				<span class="mode-hint">{m.hint}</span>
			</button>
		{/each}
	</div>

	<div class="fields">
		<TextField label="Description" bind:value={description} width="full" placeholder="Optional label" />

		{#if mode === 'full'}
			<Toggle label="Include items with no stock on hand" bind:checked={includeAllItems} />
		{:else if mode === 'filtered'}
			<SelectField
				label="Master list"
				bind:value={masterListId}
				width="full"
				placeholder="Any"
				options={masterLists.map((m) => ({ value: m.id, label: m.name }))}
			/>
			{#if masterListId}
				<Toggle
					label="Include all master-list items (incl. zero stock)"
					bind:checked={includeAllMasterListItems}
				/>
			{/if}
			<SelectField
				label="Location"
				bind:value={locationId}
				width="full"
				placeholder={locations.length ? 'Any' : 'No locations in this store'}
				options={locations.map((l) => ({ value: l.id, label: l.name || l.code || l.id }))}
			/>
			<DateField label="Expires before" bind:value={expiresBefore} />
		{/if}
	</div>

	<div class="feedback" aria-live="polite">
		{#if mode === 'blank'}
			A blank stocktake — no lines are generated.
		{:else if estimating}
			Estimating…
		{:else if estimate != null}
			Will generate ≈ <strong>{estimate.toLocaleString()}</strong> line{estimate === 1 ? '' : 's'}.
			{#if includeAllItems || includeAllMasterListItems}<span class="muted"> (plus zero-stock items)</span>{/if}
		{:else}
			Estimate unavailable.
		{/if}
	</div>

	{#if error}<p class="err" role="alert">⚠ {error}</p>{/if}

	{#snippet footer()}
		<Button variant="ghost" onclick={() => (open = false)}>Cancel</Button>
		<Button variant="primary" onclick={confirm} disabled={saving}>
			{saving ? 'Creating…' : 'Create'}
		</Button>
	{/snippet}
</Modal>

<style>
	.modes {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-2);
		margin-bottom: var(--space-4);
	}
	.mode {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		text-align: start;
		padding: var(--space-3);
		border: 1px solid var(--border-default);
		border-radius: var(--radius-control);
		background: var(--surface-default);
		cursor: pointer;
	}
	.mode.active {
		border-color: var(--brand-primary);
		background: var(--brand-primary-subtle);
	}
	.mode-label {
		font-weight: 600;
	}
	.mode-hint {
		font-size: 12px;
		color: var(--text-secondary);
	}
	.fields {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}
	.feedback {
		margin-top: var(--space-4);
		padding: var(--space-3);
		background: var(--surface-sunken);
		border-radius: var(--radius-control);
		font-size: 14px;
	}
	.muted {
		color: var(--text-secondary);
	}
	.err {
		margin: var(--space-3) 0 0;
		color: var(--state-error);
	}
</style>
