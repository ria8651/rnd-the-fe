<script lang="ts">
	/**
	 * A status badge that always pairs colour with a text label (and optional icon),
	 * never colour alone — accessibility.md › Colour independence.
	 */
	type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'error';

	let {
		label,
		tone = 'neutral',
		icon
	}: { label: string; tone?: Tone; icon?: string } = $props();
</script>

<span class="badge" data-tone={tone}>
	{#if icon}<span class="icon" aria-hidden="true">{icon}</span>{/if}
	{label}
</span>

<style>
	.badge {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: 2px var(--space-2);
		border-radius: var(--radius-pill);
		font-size: 12px;
		font-weight: 600;
		line-height: 18px;
		white-space: nowrap;
		border: 1px solid transparent;
	}
	.icon {
		font-size: 11px;
	}
	/* Each tone pairs a tinted background with a readable foreground + border. */
	.badge[data-tone='neutral'] {
		background: var(--surface-sunken);
		color: var(--text-secondary);
		border-color: var(--border-default);
	}
	.badge[data-tone='info'] {
		background: var(--state-info-subtle);
		color: var(--state-info);
		border-color: var(--state-info);
	}
	.badge[data-tone='success'] {
		background: var(--state-success-subtle);
		color: var(--state-success);
		border-color: var(--state-success);
	}
	.badge[data-tone='warning'] {
		background: var(--state-warning-subtle);
		color: var(--state-warning);
		border-color: var(--state-warning);
	}
	.badge[data-tone='error'] {
		background: var(--state-error-subtle);
		color: var(--state-error);
		border-color: var(--state-error);
	}
</style>
