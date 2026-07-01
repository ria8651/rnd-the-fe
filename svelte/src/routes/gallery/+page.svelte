<script lang="ts">
	import {
		Table,
		StatusBadge,
		Button,
		TextField,
		NumericField,
		DateField,
		SelectField,
		Toggle,
		Checkbox,
		type Column,
		type SortState
	} from '$lib/ui';
	import ThemeToggle from '$lib/theme/ThemeToggle.svelte';
	import { formatDate, formatNumber, formatDelta } from '$lib/format';

	// Sample rows shaped loosely like stocktake lines, to exercise every column type.
	interface Line {
		id: string;
		code: string;
		name: string;
		batch: string;
		expiry: string;
		snapshot: number;
		counted: number | null;
		status: 'New' | 'Finalised';
	}

	const data: Line[] = [
		{ id: '1', code: 'AMX500', name: 'Amoxicillin 500mg capsules', batch: 'B-2231', expiry: '2027-04-01', snapshot: 1200, counted: 1180, status: 'New' },
		{ id: '2', code: 'PCM100', name: 'Paracetamol 100mg/5ml oral suspension 60ml', batch: 'P-0098', expiry: '2026-11-15', snapshot: 340, counted: 340, status: 'New' },
		{ id: '3', code: 'ORS', name: 'Oral rehydration salts sachets', batch: 'O-5521', expiry: '2028-01-30', snapshot: 5000, counted: 5210, status: 'New' },
		{ id: '4', code: 'BCG', name: 'BCG vaccine 20-dose vial', batch: 'V-7781', expiry: '2026-08-01', snapshot: 60, counted: null, status: 'New' },
		{ id: '5', code: 'INS', name: 'Insulin glargine 100IU/ml', batch: 'I-3310', expiry: '2026-09-12', snapshot: 80, counted: 0, status: 'Finalised' }
	];

	let selected = $state(new Set<string>());
	let sort = $state<SortState | undefined>({ key: 'code', dir: 'asc' });

	const columns: Column<Line>[] = [
		{ key: 'code', header: 'Code', priority: 1, width: '120px', sortable: true, role: 'identifier' },
		{ key: 'name', header: 'Item', priority: 1, sortable: true, tooltip: (r) => r.name },
		{ key: 'batch', header: 'Batch', priority: 3, width: '120px' },
		{ key: 'expiry', header: 'Expiry', priority: 2, width: '120px', sortable: true, format: (r) => formatDate(r.expiry) },
		{ key: 'snapshot', header: 'Snapshot', numeric: true, width: '110px', sortable: true, format: (r) => formatNumber(r.snapshot, 0) },
		{ key: 'counted', header: 'Counted', numeric: true, width: '110px', format: (r) => (r.counted == null ? '—' : formatNumber(r.counted, 0)) },
		{ key: 'difference', header: 'Difference', numeric: true, width: '110px', accessor: (r) => (r.counted == null ? 0 : r.counted - r.snapshot), format: (r) => (r.counted == null ? '' : formatDelta(r.counted - r.snapshot)) },
		{ key: 'status', header: 'Status', priority: 1, width: '120px', role: 'status' }
	];

	// Demonstrate per-cell + per-row error surfacing (e.g. after a failed finalise).
	const cellError = (row: Line, key: string) =>
		row.id === '3' && key === 'counted' ? 'Reduced below zero' : undefined;
	const rowError = (row: Line) => (row.id === '3' ? 'Stock line reduced below zero' : undefined);

	// Input demo state
	let text = $state('Central medical store');
	let qty = $state<number | null>(120);
	let date = $state<string | null>('2027-04-01');
	let sel = $state<string | null>('loc-a');
	let toggleOn = $state(true);
	let checked = $state(false);
	let errText = $state('');
</script>

<div class="page">
	<header>
		<div>
			<p class="eyebrow"><a href="/">← Foundation</a> · open-mSupply Svelte rebuild</p>
			<h1>Stage 2 — UI primitives</h1>
			<p class="sub">The shared components from <code>ui-standards</code>: Table, inputs, badges, buttons.</p>
		</div>
		<ThemeToggle />
	</header>

	<section>
		<h2>Table</h2>
		<p class="hint">
			Selectable, sortable, sticky header, responsive column-hiding (resize the window — P3 “Batch”
			drops ≤1100px, P2 “Expiry” ≤800px, and below 600px it becomes cards). Row 3 shows a
			per-cell + per-row error. {selected.size} selected.
		</p>
		<Table
			{columns}
			rows={data}
			getRowId={(r) => r.id}
			selectable
			bind:selected
			bind:sort
			{cellError}
			{rowError}
			caption="Sample stocktake lines"
		>
			{#snippet cell(row, col)}
				{#if col.key === 'status'}
					<StatusBadge
						label={row.status}
						tone={row.status === 'Finalised' ? 'success' : 'info'}
					/>
				{:else if col.key === 'difference' && row.counted != null}
					<span style:color={row.counted - row.snapshot < 0 ? 'var(--state-error)' : 'var(--text-primary)'}>
						{formatDelta(row.counted - row.snapshot)}
					</span>
				{:else}
					{col.format ? col.format(row) : (row as any)[col.key]}
				{/if}
			{/snippet}
		</Table>
	</section>

	<section>
		<h2>Status badges</h2>
		<div class="row">
			<StatusBadge label="New" tone="info" />
			<StatusBadge label="Finalised" tone="success" icon="✓" />
			<StatusBadge label="Locked" tone="warning" icon="🔒" />
			<StatusBadge label="Error" tone="error" icon="⚠" />
			<StatusBadge label="Draft" tone="neutral" />
		</div>
	</section>

	<section>
		<h2>Buttons</h2>
		<div class="row">
			<Button variant="primary">Save and confirm</Button>
			<Button variant="secondary">New stocktake</Button>
			<Button variant="ghost">Cancel</Button>
			<Button variant="danger">Delete</Button>
			<Button variant="secondary" disabled>Disabled</Button>
		</div>
	</section>

	<section>
		<h2>Inputs</h2>
		<div class="form-grid">
			<TextField label="Description" bind:value={text} width="full" help="Free-text label for the stocktake." />
			<NumericField label="Counted packs" bind:value={qty} min={0} />
			<DateField label="Expiry date" bind:value={date} />
			<SelectField
				label="Location"
				bind:value={sel}
				options={[
					{ value: 'loc-a', label: 'A1 — Main shelf' },
					{ value: 'loc-b', label: 'Cold room' },
					{ value: 'loc-c', label: 'Quarantine', disabled: true }
				]}
			/>
			<TextField label="Reason" bind:value={errText} error="A reason is required for this adjustment." width="full" />
			<div class="stack">
				<Toggle label="Include items with no stock" bind:checked={toggleOn} />
				<Checkbox label="Remember my choice" bind:checked />
			</div>
		</div>
	</section>
</div>

<style>
	.page {
		max-width: 1080px;
		margin: 0 auto;
		padding: var(--space-6) var(--space-5) var(--space-7);
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--space-5);
		flex-wrap: wrap;
		margin-bottom: var(--space-6);
	}
	.eyebrow {
		margin: 0 0 var(--space-1);
		font-size: var(--font-size-label);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-secondary);
	}
	h1 {
		margin: 0 0 var(--space-2);
	}
	.sub {
		margin: 0;
		color: var(--text-secondary);
	}
	section {
		margin-bottom: var(--space-6);
	}
	.hint {
		color: var(--text-secondary);
		font-size: 13px;
		margin: 0 0 var(--space-3);
		max-width: 70ch;
	}
	code {
		font-family: ui-monospace, Menlo, monospace;
		font-size: 12px;
		background: var(--surface-sunken);
		border: 1px solid var(--border-default);
		border-radius: var(--radius-sm);
		padding: 1px 5px;
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		align-items: center;
	}
	.form-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: var(--space-4);
		align-items: start;
		background: var(--surface-default);
		border: 1px solid var(--border-default);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-card);
		padding: var(--space-5);
	}
	.stack {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
</style>
