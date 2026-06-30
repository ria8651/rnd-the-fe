<script lang="ts">
	/**
	 * Checkbox with a 48×48 hit area (accessibility.md › Touch targets) around a
	 * smaller visual box. Supports an indeterminate state for "select all".
	 */
	let {
		checked = $bindable(false),
		indeterminate = false,
		label,
		ariaLabel,
		id,
		disabled = false,
		onchange
	}: {
		checked?: boolean;
		indeterminate?: boolean;
		label?: string;
		ariaLabel?: string;
		id?: string;
		disabled?: boolean;
		onchange?: (checked: boolean) => void;
	} = $props();

	const auto = $props.id();
	const fieldId = $derived(id ?? auto);

	let input = $state<HTMLInputElement>();
	$effect(() => {
		if (input) input.indeterminate = indeterminate;
	});
</script>

<label class="checkbox" class:disabled for={fieldId}>
	<input
		bind:this={input}
		type="checkbox"
		id={fieldId}
		bind:checked
		{disabled}
		aria-label={!label ? ariaLabel : undefined}
		onchange={() => onchange?.(checked)}
	/>
	<span class="box" aria-hidden="true"></span>
	{#if label}<span class="label">{label}</span>{/if}
</label>

<style>
	.checkbox {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		cursor: pointer;
		min-width: var(--touch-target);
		min-height: var(--touch-target);
		padding: var(--space-1);
	}
	.checkbox.disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}
	input {
		position: absolute;
		opacity: 0;
		width: 1px;
		height: 1px;
	}
	.box {
		width: 18px;
		height: 18px;
		flex: none;
		border: 1.5px solid var(--border-strong);
		border-radius: var(--radius-sm);
		background: var(--surface-default);
		display: grid;
		place-items: center;
		transition:
			background var(--transition-fast),
			border-color var(--transition-fast);
	}
	input:checked + .box,
	input:indeterminate + .box {
		background: var(--brand-primary);
		border-color: var(--brand-primary);
	}
	input:checked + .box::after {
		content: '';
		width: 5px;
		height: 9px;
		border: solid var(--brand-on-primary);
		border-width: 0 2px 2px 0;
		transform: translateY(-1px) rotate(45deg);
	}
	input:indeterminate + .box::after {
		content: '';
		width: 9px;
		height: 2px;
		background: var(--brand-on-primary);
	}
	input:focus-visible + .box {
		outline: 2px solid var(--focus-ring);
		outline-offset: 2px;
	}
	.label {
		font-size: var(--font-size-cell);
	}
</style>
