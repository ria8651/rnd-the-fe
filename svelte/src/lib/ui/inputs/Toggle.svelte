<script lang="ts">
	/** On/off switch using the accent colour when on (inputs.md). */
	let {
		checked = $bindable(false),
		label,
		id,
		disabled = false,
		onchange
	}: {
		checked?: boolean;
		label: string;
		id?: string;
		disabled?: boolean;
		onchange?: (checked: boolean) => void;
	} = $props();

	const auto = $props.id();
	const fieldId = $derived(id ?? auto);
</script>

<label class="toggle" class:disabled for={fieldId}>
	<input
		type="checkbox"
		id={fieldId}
		role="switch"
		bind:checked
		{disabled}
		onchange={() => onchange?.(checked)}
	/>
	<span class="track" aria-hidden="true"><span class="thumb"></span></span>
	<span class="label">{label}</span>
</label>

<style>
	.toggle {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		cursor: pointer;
		min-height: var(--touch-target);
	}
	.toggle.disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}
	input {
		position: absolute;
		opacity: 0;
		width: 1px;
		height: 1px;
	}
	.track {
		width: 40px;
		height: 24px;
		border-radius: var(--radius-pill);
		background: var(--border-strong);
		transition: background var(--transition-fast);
		flex: none;
		padding: 2px;
	}
	.thumb {
		display: block;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--surface-default);
		transition: transform var(--transition-fast);
	}
	input:checked + .track {
		background: var(--brand-primary);
	}
	input:checked + .track .thumb {
		transform: translateX(16px);
	}
	input:focus-visible + .track {
		outline: 2px solid var(--focus-ring);
		outline-offset: 2px;
	}
	.label {
		font-size: var(--font-size-cell);
	}
</style>
