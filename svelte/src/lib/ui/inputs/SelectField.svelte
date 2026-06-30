<script lang="ts" generics="V extends string | number">
	import FieldShell from './FieldShell.svelte';
	import Popover from '../Popover.svelte';
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
		placeholder = 'Select…',
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
	const listId = $derived(`${fieldId}-list`);
	const optId = (i: number) => `${fieldId}-opt-${i}`;

	let open = $state(false);
	let activeIndex = $state(-1);
	let triggerEl = $state<HTMLButtonElement>();
	let listEl = $state<HTMLElement>();

	const selectedIndex = $derived(options.findIndex((o) => o.value === value));
	const selectedLabel = $derived(selectedIndex >= 0 ? options[selectedIndex].label : '');

	function openList() {
		if (disabled) return;
		open = true;
		activeIndex = selectedIndex >= 0 ? selectedIndex : firstEnabled();
	}
	function close(refocus = true) {
		open = false;
		if (refocus) triggerEl?.focus();
	}
	function choose(i: number) {
		const opt = options[i];
		if (!opt || opt.disabled) return;
		value = opt.value;
		onchange?.(value ?? null);
		close();
	}

	function firstEnabled() {
		return options.findIndex((o) => !o.disabled);
	}
	function step(from: number, dir: 1 | -1) {
		let i = from;
		for (let n = 0; n < options.length; n++) {
			i = (i + dir + options.length) % options.length;
			if (!options[i].disabled) return i;
		}
		return from;
	}

	function onKeydown(e: KeyboardEvent) {
		if (!open) {
			if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
				e.preventDefault();
				openList();
			}
			return;
		}
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				activeIndex = step(activeIndex, 1);
				break;
			case 'ArrowUp':
				e.preventDefault();
				activeIndex = step(activeIndex, -1);
				break;
			case 'Home':
				e.preventDefault();
				activeIndex = firstEnabled();
				break;
			case 'End':
				e.preventDefault();
				activeIndex = step(0, -1);
				break;
			case 'Enter':
			case ' ':
				e.preventDefault();
				choose(activeIndex);
				break;
			case 'Tab':
				close(false);
				break;
		}
	}

	// Keep the active option scrolled into view.
	$effect(() => {
		if (open && listEl && activeIndex >= 0) {
			listEl.querySelector<HTMLElement>(`#${CSS.escape(optId(activeIndex))}`)?.scrollIntoView({
				block: 'nearest'
			});
		}
	});
</script>

<FieldShell {label} id={fieldId} {required} {error} {help} {width}>
	<Popover bind:open matchWidth>
		{#snippet trigger()}
			<button
				bind:this={triggerEl}
				data-popover-trigger
				class="control select-trigger"
				class:compact
				class:placeholder={selectedIndex < 0}
				id={fieldId}
				type="button"
				role="combobox"
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-controls={listId}
				aria-invalid={error ? 'true' : undefined}
				aria-describedby={error ? `${fieldId}-error` : help ? `${fieldId}-help` : undefined}
				aria-activedescendant={open && activeIndex >= 0 ? optId(activeIndex) : undefined}
				{disabled}
				onclick={() => (open ? close(false) : openList())}
				onkeydown={onKeydown}
			>
				<span class="value">{selectedLabel || placeholder}</span>
				<span class="chevron" aria-hidden="true">▾</span>
			</button>
		{/snippet}

		<ul bind:this={listEl} class="listbox" id={listId} role="listbox" aria-label={label}>
			{#each options as opt, i (opt.value)}
				<!-- Keyboard is handled at the combobox (trigger) level via aria-activedescendant,
				     per the ARIA listbox pattern; options are pointer targets only. -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<li
					id={optId(i)}
					role="option"
					aria-selected={opt.value === value}
					aria-disabled={opt.disabled}
					class:active={i === activeIndex}
					class:selected={opt.value === value}
					class:disabled={opt.disabled}
					onpointerenter={() => !opt.disabled && (activeIndex = i)}
					onclick={() => choose(i)}
				>
					<span class="opt-label">{opt.label}</span>
					{#if opt.value === value}<span class="check" aria-hidden="true">✓</span>{/if}
				</li>
			{/each}
		</ul>
	</Popover>
</FieldShell>

<style>
	.select-trigger {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		width: 100%;
		text-align: start;
		cursor: pointer;
	}
	.select-trigger.placeholder .value {
		color: var(--text-disabled);
	}
	.value {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.chevron {
		color: var(--text-secondary);
		font-size: 12px;
		flex: none;
	}

	.listbox {
		list-style: none;
		margin: 0;
		padding: var(--space-1);
		max-height: 280px;
		overflow-y: auto;
	}
	.listbox li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		min-height: 40px;
		padding: 0 var(--space-3);
		border-radius: var(--radius-sm);
		cursor: pointer;
		color: var(--text-primary);
	}
	.listbox li.active {
		background: var(--brand-primary-subtle);
	}
	.listbox li.selected {
		font-weight: 600;
	}
	.listbox li.disabled {
		color: var(--text-disabled);
		cursor: not-allowed;
	}
	.check {
		color: var(--brand-primary);
	}
</style>
