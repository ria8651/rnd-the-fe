<script lang="ts">
	/**
	 * A click-popover anchored to a trigger. The consumer owns `open` (so the
	 * trigger can toggle it) and supplies a `trigger` snippet + content `children`.
	 * Dismisses on outside-click and Escape. Used by SelectField and the chrome
	 * store/language selectors.
	 */
	import type { Snippet } from 'svelte';

	let {
		open = $bindable(false),
		placement = 'bottom-start',
		matchWidth = false,
		trigger,
		children
	}: {
		open?: boolean;
		placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
		matchWidth?: boolean;
		trigger: Snippet;
		children: Snippet;
	} = $props();

	let root = $state<HTMLElement>();

	function onWindowPointer(e: MouseEvent) {
		if (open && root && !root.contains(e.target as Node)) open = false;
	}
	function onKeydown(e: KeyboardEvent) {
		if (open && e.key === 'Escape') {
			open = false;
			(root?.querySelector('[data-popover-trigger]') as HTMLElement | null)?.focus();
		}
	}
</script>

<svelte:window onpointerdown={onWindowPointer} onkeydown={onKeydown} />

<div class="pop-root" bind:this={root}>
	{@render trigger()}
	{#if open}
		<div class="pop-content" data-placement={placement} class:match-width={matchWidth}>
			{@render children()}
		</div>
	{/if}
</div>

<style>
	.pop-root {
		position: relative;
		display: inline-block;
	}
	.pop-content {
		position: absolute;
		z-index: var(--z-popover);
		min-width: 200px;
		background: var(--surface-raised);
		border: 1px solid var(--border-default);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-popover);
		overflow: hidden;
	}
	.pop-content.match-width {
		min-width: 100%;
	}
	.pop-content[data-placement='bottom-start'] {
		top: calc(100% + 4px);
		inset-inline-start: 0;
	}
	.pop-content[data-placement='bottom-end'] {
		top: calc(100% + 4px);
		inset-inline-end: 0;
	}
	.pop-content[data-placement='top-start'] {
		bottom: calc(100% + 4px);
		inset-inline-start: 0;
	}
	.pop-content[data-placement='top-end'] {
		bottom: calc(100% + 4px);
		inset-inline-end: 0;
	}
</style>
