<script lang="ts">
	import type { Snippet } from 'svelte';

	type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

	let {
		variant = 'secondary',
		type = 'button',
		href,
		disabled = false,
		compact = false,
		title,
		ariaLabel,
		onclick,
		children
	}: {
		variant?: Variant;
		type?: 'button' | 'submit';
		href?: string;
		disabled?: boolean;
		compact?: boolean;
		title?: string;
		ariaLabel?: string;
		onclick?: (e: MouseEvent) => void;
		children: Snippet;
	} = $props();
</script>

{#if href && !disabled}
	<a class="btn" data-variant={variant} class:compact {href} {title} aria-label={ariaLabel}>
		{@render children()}
	</a>
{:else}
	<button
		class="btn"
		data-variant={variant}
		class:compact
		{type}
		{disabled}
		{title}
		aria-label={ariaLabel}
		{onclick}
	>
		{@render children()}
	</button>
{/if}

<style>
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		min-height: var(--touch-target);
		padding: 0 var(--space-4);
		font-family: inherit;
		font-size: var(--font-size-cell);
		font-weight: 600;
		line-height: 1;
		border-radius: var(--radius);
		border: 1px solid transparent;
		cursor: pointer;
		text-decoration: none;
		white-space: nowrap;
		transition:
			background var(--transition-fast),
			border-color var(--transition-fast),
			color var(--transition-fast);
	}
	.btn.compact {
		min-height: var(--field-height-compact);
		padding: 0 var(--space-3);
	}
	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn[data-variant='primary'] {
		background: var(--brand-primary);
		color: var(--brand-on-primary);
	}
	.btn[data-variant='primary']:hover:not(:disabled) {
		background: var(--brand-primary-hover);
	}

	.btn[data-variant='secondary'] {
		background: var(--surface-default);
		color: var(--text-primary);
		border-color: var(--border-strong);
	}
	.btn[data-variant='secondary']:hover:not(:disabled) {
		background: var(--hover-overlay);
	}

	.btn[data-variant='ghost'] {
		background: transparent;
		color: var(--text-primary);
	}
	.btn[data-variant='ghost']:hover:not(:disabled) {
		background: var(--hover-overlay);
	}

	.btn[data-variant='danger'] {
		background: var(--state-error);
		color: #fff;
	}
	.btn[data-variant='danger']:hover:not(:disabled) {
		filter: brightness(0.92);
	}
</style>
