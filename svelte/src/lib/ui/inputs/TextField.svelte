<script lang="ts">
	import FieldShell from './FieldShell.svelte';
	import type { FieldWidth } from './field-widths';

	let {
		value = $bindable(''),
		label,
		id,
		placeholder,
		error,
		help,
		required = false,
		disabled = false,
		compact = false,
		width = 'full',
		hideLabel = false,
		oninput
	}: {
		value?: string;
		label?: string;
		id?: string;
		placeholder?: string;
		error?: string;
		help?: string;
		required?: boolean;
		disabled?: boolean;
		compact?: boolean;
		width?: FieldWidth | string;
		hideLabel?: boolean;
		oninput?: (value: string) => void;
	} = $props();

	const auto = $props.id();
	const fieldId = $derived(id ?? auto);
</script>

<FieldShell {label} id={fieldId} {required} {error} {help} {width} {hideLabel}>
	<input
		class="control"
		class:compact
		id={fieldId}
		type="text"
		bind:value
		{placeholder}
		{disabled}
		{required}
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={error ? `${fieldId}-error` : help ? `${fieldId}-help` : undefined}
		oninput={() => oninput?.(value)}
	/>
</FieldShell>
