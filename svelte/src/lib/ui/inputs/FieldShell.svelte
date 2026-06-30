<script lang="ts">
	/**
	 * Shared wrapper for form fields: static label above the control (inputs.md),
	 * plus helper/error text. Errors show an icon + message (not colour alone) —
	 * accessibility.md › Colour independence.
	 */
	import type { Snippet } from 'svelte';
	import { resolveWidth, type FieldWidth } from './field-widths';

	let {
		label,
		id,
		required = false,
		error,
		help,
		width,
		children
	}: {
		label?: string;
		id: string;
		required?: boolean;
		error?: string;
		help?: string;
		width?: FieldWidth | string;
		children: Snippet;
	} = $props();

	const resolved = $derived(resolveWidth(width));
	const errorId = $derived(error ? `${id}-error` : undefined);
	const helpId = $derived(help ? `${id}-help` : undefined);
</script>

<div class="field" style:width={resolved} class:has-error={!!error}>
	{#if label}
		<label for={id}>
			{label}{#if required}<span class="req" aria-hidden="true">*</span>{/if}
		</label>
	{/if}
	{@render children()}
	{#if error}
		<p class="msg error" id={errorId} role="alert">
			<span class="icon" aria-hidden="true">⚠</span>{error}
		</p>
	{:else if help}
		<p class="msg help" id={helpId}>{help}</p>
	{/if}
</div>

<style>
	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		max-width: 100%;
		min-width: 0;
	}
	label {
		font-size: 12px;
		font-weight: 600;
		color: var(--text-secondary);
	}
	.req {
		color: var(--state-error);
		margin-inline-start: 2px;
	}
	.msg {
		margin: 0;
		font-size: 12px;
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}
	.help {
		color: var(--text-secondary);
	}
	.error {
		color: var(--state-error);
	}
	.icon {
		font-size: 12px;
	}
</style>
