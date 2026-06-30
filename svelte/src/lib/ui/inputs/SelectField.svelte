<script lang="ts" generics="V extends string | number">
	import FieldShell from './FieldShell.svelte';
	import type { FieldWidth } from './field-widths';

	interface Option {
		value: V;
		label: string;
		disabled?: boolean;
	}

	let {
		value = $bindable(),
		options,
		label,
		id,
		placeholder,
		error,
		help,
		required = false,
		disabled = false,
		compact = false,
		width = 'half',
		onchange
	}: {
		value?: V | null;
		options: Option[];
		label?: string;
		id?: string;
		placeholder?: string;
		error?: string;
		help?: string;
		required?: boolean;
		disabled?: boolean;
		compact?: boolean;
		width?: FieldWidth | string;
		onchange?: (value: V | null) => void;
	} = $props();

	const auto = $props.id();
	const fieldId = $derived(id ?? auto);
</script>

<FieldShell {label} id={fieldId} {required} {error} {help} {width}>
	<div class="select-wrap">
		<select
			class="control"
			class:compact
			id={fieldId}
			bind:value
			{disabled}
			{required}
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={error ? `${fieldId}-error` : help ? `${fieldId}-help` : undefined}
			onchange={() => onchange?.(value ?? null)}
		>
			{#if placeholder}
				<option value={null} disabled selected={value == null}>{placeholder}</option>
			{/if}
			{#each options as opt (opt.value)}
				<option value={opt.value} disabled={opt.disabled}>{opt.label}</option>
			{/each}
		</select>
		<span class="chevron" aria-hidden="true">▾</span>
	</div>
</FieldShell>

<style>
	.select-wrap {
		position: relative;
		display: block;
	}
	select.control {
		appearance: none;
		padding-inline-end: var(--space-6);
		cursor: pointer;
	}
	.chevron {
		position: absolute;
		inset-inline-end: var(--space-3);
		top: 50%;
		transform: translateY(-50%);
		pointer-events: none;
		color: var(--text-secondary);
		font-size: 12px;
	}
</style>
