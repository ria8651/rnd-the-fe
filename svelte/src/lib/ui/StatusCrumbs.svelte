<script lang="ts">
	/**
	 * Status crumbs — a compact, read-only lifecycle indicator (spec
	 * ui-standards/controls.md › Status crumbs). Generic across document types: the
	 * caller supplies an ordered list of statuses and, for each reached status, the
	 * timestamp it was reached. Reached statuses are emphasised, later ones muted; the
	 * current status is the last reached one. State is conveyed by position + text, not
	 * colour alone.
	 *
	 * Revealing the crumbs (click / focus / tap — not hover-only) opens a vertical
	 * stepper showing WHEN each status was reached. On small screens the row collapses
	 * to a single "Status: {current}" label.
	 */
	import Popover from './Popover.svelte';
	import Icon from '$lib/icons/Icon.svelte';
	import { formatDate } from '$lib/format';

	interface Step {
		value: string;
		label: string;
		/** Timestamp this status was reached; null/undefined ⇒ not yet reached. */
		reachedAt?: string | null;
	}

	let {
		steps,
		current,
		label = 'Status'
	}: {
		steps: Step[];
		current: string;
		label?: string;
	} = $props();

	const currentIndex = $derived(steps.findIndex((s) => s.value === current));
	const currentStep = $derived(steps[currentIndex]);
	const reached = (i: number) => i <= currentIndex;

	let open = $state(false);
</script>

<div class="crumbs-root">
	<Popover bind:open placement="top-end">
		{#snippet trigger()}
			<button
				type="button"
				class="crumbs"
				data-popover-trigger
				aria-haspopup="dialog"
				aria-expanded={open}
				aria-label={`${label} history`}
				onclick={() => (open = !open)}
			>
				<!-- Full crumb row (wider viewports). -->
				<span class="full" aria-hidden="false">
					{#each steps as s, i (s.value)}
						{#if i > 0}
							<span class="sep" aria-hidden="true"><Icon name="chevron-down" size={14} /></span>
						{/if}
						<span class="crumb" class:reached={reached(i)} class:current={s.value === current}>
							{s.label}
						</span>
					{/each}
				</span>
				<!-- Collapsed label (small viewports). -->
				<span class="collapsed">{label}: <strong>{currentStep?.label ?? '—'}</strong></span>
			</button>
		{/snippet}

		<div class="history" role="dialog" aria-label={`${label} history`}>
			<ol>
				{#each steps as s, i (s.value)}
					<li class:reached={reached(i)} class:current={s.value === current}>
						<span class="dot" aria-hidden="true"></span>
						<span class="h-label">{s.label}</span>
						<span class="h-when">
							{#if s.reachedAt}{formatDate(s.reachedAt)}{:else if reached(i)}—{:else}Not yet{/if}
						</span>
					</li>
				{/each}
			</ol>
		</div>
	</Popover>
</div>

<style>
	.crumbs {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		background: none;
		border: 0;
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-control);
		font: inherit;
		color: var(--text-secondary);
		cursor: pointer;
	}
	.crumbs:hover,
	.crumbs:focus-visible {
		background: var(--hover-overlay);
	}
	.full {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
	}
	.crumb {
		color: var(--text-secondary);
		font-weight: 500;
	}
	.crumb.reached {
		color: var(--text-accent, var(--brand-primary));
	}
	.crumb.current {
		font-weight: 700;
	}
	/* chevron-down rotated -90° → a forward chevron; flips under RTL. */
	.sep {
		display: inline-flex;
		color: var(--text-tertiary);
		transform: rotate(-90deg);
	}
	:global([dir='rtl']) .sep {
		transform: rotate(90deg);
	}
	.collapsed {
		display: none;
		white-space: nowrap;
	}

	.history {
		padding: var(--space-3);
		min-width: 220px;
	}
	.history ol {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.history li {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: var(--space-2);
		color: var(--text-secondary);
	}
	.history li.reached {
		color: var(--text-primary);
	}
	.history li.current .h-label {
		font-weight: 700;
	}
	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		border: 1.5px solid var(--border-strong);
		background: var(--surface-default);
	}
	.history li.reached .dot {
		background: var(--text-accent, var(--brand-primary));
		border-color: var(--text-accent, var(--brand-primary));
	}
	.h-when {
		font-size: 13px;
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
	}

	@media (max-width: 640px) {
		.full {
			display: none;
		}
		.collapsed {
			display: inline;
			color: var(--text-primary);
		}
	}
</style>
