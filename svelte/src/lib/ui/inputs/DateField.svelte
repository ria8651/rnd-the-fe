<script lang="ts">
	import FieldShell from './FieldShell.svelte';
	import type { FieldWidth } from './field-widths';

	/**
	 * Date entry. Binds an ISO date-only string (YYYY-MM-DD), the shape the API
	 * uses (NaiveDate). Display format is browser/OS-controlled for the native
	 * picker; values are rendered DD/MM/YYYY elsewhere via format.ts.
	 * (Spec note: DD/MM/YYYY *input* display would need a custom picker — see Stage 2 notes.)
	 */
	let {
		value = $bindable(null),
		label,
		id,
		error,
		help,
		required = false,
		disabled = false,
		compact = false,
		width = 'date',
		onchange
	}: {
		value?: string | null;
		label?: string;
		id?: string;
		error?: string;
		help?: string;
		required?: boolean;
		disabled?: boolean;
		compact?: boolean;
		width?: FieldWidth | string;
		onchange?: (value: string | null) => void;
	} = $props();

	const auto = $props.id();
	const fieldId = $derived(id ?? auto);
</script>

<FieldShell {label} id={fieldId} {required} {error} {help} {width}>
	<input
		class="control"
		class:compact
		id={fieldId}
		type="date"
		bind:value
		{disabled}
		{required}
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={error ? `${fieldId}-error` : help ? `${fieldId}-help` : undefined}
		onchange={() => onchange?.(value)}
	/>
</FieldShell>
