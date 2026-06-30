<script lang="ts">
	import FieldShell from './FieldShell.svelte';
	import type { FieldWidth } from './field-widths';

	/**
	 * Numeric entry: right-aligned, tabular figures, optional min/max/step clamp.
	 * Binds a `number | null` (null = empty), which suits "not yet counted" values.
	 */
	let {
		value = $bindable(null),
		label,
		id,
		min,
		max,
		step,
		placeholder,
		error,
		help,
		required = false,
		disabled = false,
		compact = false,
		width = 'qty',
		onchange
	}: {
		value?: number | null;
		label?: string;
		id?: string;
		min?: number;
		max?: number;
		step?: number;
		placeholder?: string;
		error?: string;
		help?: string;
		required?: boolean;
		disabled?: boolean;
		compact?: boolean;
		width?: FieldWidth | string;
		onchange?: (value: number | null) => void;
	} = $props();

	const auto = $props.id();
	const fieldId = $derived(id ?? auto);

	// Local string mirror so we can represent "empty" cleanly and clamp on commit.
	let text = $state(value == null ? '' : String(value));
	$effect(() => {
		text = value == null ? '' : String(value);
	});

	function commit() {
		if (text.trim() === '') {
			value = null;
		} else {
			let n = Number(text);
			if (Number.isNaN(n)) return; // ignore invalid; keep prior value
			if (min != null && n < min) n = min;
			if (max != null && n > max) n = max;
			value = n;
			text = String(n);
		}
		onchange?.(value);
	}
</script>

<FieldShell {label} id={fieldId} {required} {error} {help} {width}>
	<input
		class="control numeric"
		class:compact
		id={fieldId}
		type="number"
		inputmode="decimal"
		bind:value={text}
		{min}
		{max}
		{step}
		{placeholder}
		{disabled}
		{required}
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={error ? `${fieldId}-error` : help ? `${fieldId}-help` : undefined}
		onblur={commit}
	/>
</FieldShell>
