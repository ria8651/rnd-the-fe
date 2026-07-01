<script lang="ts">
	/**
	 * Split (multi-action) button — the shared control for an action with one default
	 * target plus alternatives (spec ui-standards/controls.md › Split (multi-action)
	 * button). A single pill of two fused segments:
	 *   - primary segment: performs the currently-selected option directly (`onaction`);
	 *   - disclosure segment: opens a menu of ALL options. Picking one makes it the new
	 *     primary (remembered) and fires `onchange` — it does NOT run the action.
	 *
	 * Options that aren't valid from the current state are shown but disabled, so the
	 * menu doubles as a legend of the lifecycle. Confirmation/guards for an irreversible
	 * or precondition-gated primary are the caller's concern (act on `onaction`). Follows
	 * the disabled-vs-hidden rule: hide the whole control when the action is unavailable.
	 */
	import Popover from './Popover.svelte';
	import Icon from '$lib/icons/Icon.svelte';

	interface SplitOption {
		value: string;
		label: string;
		/** Shown in the menu but not pickable (e.g. the current/past status). */
		disabled?: boolean;
	}

	let {
		options,
		value = $bindable(),
		disabled = false,
		primaryIcon = 'arrow-right',
		menuLabel = 'Choose action',
		onaction,
		onchange
	}: {
		options: SplitOption[];
		/** Currently-selected option value; defaults to the first enabled option. */
		value?: string;
		disabled?: boolean;
		primaryIcon?: string;
		menuLabel?: string;
		onaction?: (value: string) => void;
		onchange?: (value: string) => void;
	} = $props();

	const firstEnabled = $derived(options.find((o) => !o.disabled)?.value);
	// Resolve the effective selection: caller's value if it's enabled, else first enabled.
	const current = $derived.by(() => {
		const picked = options.find((o) => o.value === value && !o.disabled);
		return picked?.value ?? firstEnabled;
	});
	const currentOption = $derived(options.find((o) => o.value === current));

	let open = $state(false);

	function runPrimary() {
		if (disabled || current == null) return;
		onaction?.(current);
	}

	function pick(v: string) {
		open = false;
		if (v === current) return;
		value = v;
		onchange?.(v);
	}
</script>

<div class="split" class:disabled>
	<button
		type="button"
		class="primary"
		{disabled}
		onclick={runPrimary}
	>
		<span>{currentOption?.label ?? ''}</span>
		<Icon name={primaryIcon} size={16} />
	</button>
	<Popover bind:open placement="bottom-end">
		{#snippet trigger()}
			<button
				type="button"
				class="disclosure"
				data-popover-trigger
				{disabled}
				aria-haspopup="menu"
				aria-expanded={open}
				aria-label={menuLabel}
				onclick={() => (open = !open)}
			>
				<Icon name="chevron-down" size={16} />
			</button>
		{/snippet}
		<ul class="menu" role="menu" aria-label={menuLabel}>
			{#each options as o (o.value)}
				<li role="none">
					<button
						type="button"
						role="menuitemradio"
						aria-checked={o.value === current}
						class="item"
						class:selected={o.value === current}
						disabled={o.disabled}
						onclick={() => pick(o.value)}
					>
						<span class="check">
							{#if o.value === current}<Icon name="check" size={16} />{/if}
						</span>
						<span class="label">{o.label}</span>
					</button>
				</li>
			{/each}
		</ul>
	</Popover>
</div>

<style>
	.split {
		display: inline-flex;
		align-items: stretch;
		border-radius: var(--radius-pill);
		box-shadow: var(--shadow-card);
		overflow: visible;
	}
	.split.disabled {
		opacity: 0.5;
	}
	.primary,
	.disclosure {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		min-height: var(--touch-target);
		background: var(--surface-default);
		color: var(--text-primary);
		border: 1px solid var(--border-strong);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}
	.primary {
		padding: 0 var(--space-4);
		border-start-start-radius: var(--radius-pill);
		border-end-start-radius: var(--radius-pill);
		border-inline-end: 0;
	}
	.disclosure {
		padding: 0 var(--space-2);
		border-start-end-radius: var(--radius-pill);
		border-end-end-radius: var(--radius-pill);
		/* Hairline divider between the two fused segments. */
		border-inline-start: 1px solid var(--border-strong);
	}
	.primary:hover:not(:disabled),
	.disclosure:hover:not(:disabled) {
		background: var(--hover-overlay);
	}
	.primary:disabled,
	.disclosure:disabled {
		cursor: not-allowed;
	}
	.menu {
		list-style: none;
		margin: 0;
		padding: var(--space-1);
		min-width: 240px;
	}
	.item {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		width: 100%;
		text-align: start;
		padding: var(--space-2) var(--space-2);
		background: none;
		border: 0;
		border-radius: var(--radius-control);
		font: inherit;
		color: var(--text-primary);
		cursor: pointer;
	}
	.item:hover:not(:disabled) {
		background: var(--hover-overlay);
	}
	.item.selected {
		font-weight: 600;
	}
	.item:disabled {
		color: var(--text-secondary);
		opacity: 0.7;
		cursor: not-allowed;
	}
	.check {
		display: inline-flex;
		width: 16px;
		color: var(--brand-primary);
	}
	.label {
		flex: 1;
	}
</style>
