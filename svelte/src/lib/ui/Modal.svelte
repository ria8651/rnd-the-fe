<script lang="ts">
	/**
	 * Accessible modal dialog: scrim, Escape-to-close, focus moves in on open and
	 * returns to the opener on close, basic focus trap. Used for confirmations
	 * (logout, finalise) and detail dialogs.
	 */
	import type { Snippet } from 'svelte';

	let {
		open = $bindable(false),
		title,
		onclose,
		children,
		footer,
		width = '460px'
	}: {
		open?: boolean;
		title: string;
		onclose?: () => void;
		children: Snippet;
		footer?: Snippet;
		width?: string;
	} = $props();

	let dialog = $state<HTMLElement>();
	let opener: Element | null = null;

	function close() {
		open = false;
		onclose?.();
		(opener as HTMLElement | null)?.focus?.();
	}

	$effect(() => {
		if (open) {
			opener = document.activeElement;
			queueMicrotask(() => {
				const focusable = dialog?.querySelector<HTMLElement>(
					'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
				);
				(focusable ?? dialog)?.focus();
			});
		}
	});

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			close();
		} else if (e.key === 'Tab' && dialog) {
			const items = [
				...dialog.querySelectorAll<HTMLElement>(
					'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
				)
			].filter((el) => !el.hasAttribute('disabled'));
			if (items.length === 0) return;
			const first = items[0];
			const last = items[items.length - 1];
			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		}
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="scrim" onclick={close}></div>
	<div
		class="modal"
		role="dialog"
		aria-modal="true"
		aria-label={title}
		tabindex="-1"
		bind:this={dialog}
		onkeydown={onKeydown}
		style:width
	>
		<header>
			<h2>{title}</h2>
			<button class="close" type="button" aria-label="Close" onclick={close}>✕</button>
		</header>
		<div class="body">{@render children()}</div>
		{#if footer}<footer>{@render footer()}</footer>{/if}
	</div>
{/if}

<style>
	.scrim {
		position: fixed;
		inset: 0;
		background: var(--surface-scrim);
		z-index: var(--z-modal);
	}
	.modal {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		max-width: calc(100vw - var(--space-5));
		max-height: calc(100vh - var(--space-6));
		overflow: auto;
		background: var(--surface-raised);
		border: 1px solid var(--border-default);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-modal);
		z-index: var(--z-modal);
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		padding: var(--space-4) var(--space-5);
		border-bottom: 1px solid var(--divider);
	}
	h2 {
		margin: 0;
		font-size: 16px;
	}
	.close {
		border: 0;
		background: transparent;
		color: var(--text-secondary);
		font-size: 16px;
		cursor: pointer;
		width: 32px;
		height: 32px;
		border-radius: var(--radius-sm);
	}
	.close:hover {
		background: var(--hover-overlay);
	}
	.body {
		padding: var(--space-5);
	}
	footer {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-3);
		padding: var(--space-4) var(--space-5);
		border-top: 1px solid var(--divider);
	}
</style>
