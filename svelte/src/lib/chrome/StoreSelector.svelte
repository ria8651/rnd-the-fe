<script lang="ts">
	import { goto } from '$app/navigation';
	import Popover from '$lib/ui/Popover.svelte';
	import Checkbox from '$lib/ui/inputs/Checkbox.svelte';
	import { auth } from '$lib/auth/auth.svelte';
	import { ROOT_PATH } from './nav-config';

	let open = $state(false);
	let query = $state('');

	// Hidden entirely if there's nothing to switch to (AC-CH5).
	const hasChoice = $derived(auth.stores.length >= 2);

	// Sorted by name, filtered by the search (AC-CH6).
	const filtered = $derived(
		[...auth.stores]
			.sort((a, b) => a.name.localeCompare(b.name))
			.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
	);

	function select(id: string) {
		const store = auth.stores.find((s) => s.id === id);
		if (!store || store.isDisabled || store.isOnHold || id === auth.storeId) return;
		auth.setStore(id);
		open = false;
		query = '';
		// Land in a valid place for the new store, not a stale deep link (AC-CH8).
		goto(ROOT_PATH);
	}
</script>

{#if hasChoice}
	<Popover bind:open placement="top-start">
		{#snippet trigger()}
			<button
				class="bar-control"
				data-popover-trigger
				type="button"
				aria-haspopup="dialog"
				aria-expanded={open}
				onclick={() => (open = !open)}
			>
				<span aria-hidden="true">🏠</span>
				<span class="label">{auth.currentStore?.name ?? 'Select store'}</span>
			</button>
		{/snippet}

		<div class="store-pop">
			<input
				class="control compact"
				type="search"
				placeholder="Search stores…"
				bind:value={query}
				aria-label="Search stores"
			/>
			<ul role="listbox" aria-label="Stores">
				{#each filtered as store (store.id)}
					{@const unselectable = store.isDisabled || store.isOnHold || store.id === auth.storeId}
					<li>
						<button
							type="button"
							role="option"
							aria-selected={store.id === auth.storeId}
							class:current={store.id === auth.storeId}
							disabled={unselectable}
							onclick={() => select(store.id)}
						>
							<span class="name">{store.name}</span>
							<span class="code">{store.code}</span>
							{#if store.id === auth.storeId}<span class="tag">Current</span>{/if}
							{#if store.isOnHold}<span class="tag warn">On hold</span>{/if}
							{#if store.isDisabled}<span class="tag">Disabled</span>{/if}
						</button>
					</li>
				{/each}
				{#if filtered.length === 0}<li class="none">No stores match.</li>{/if}
			</ul>
			<label class="remember">
				<Checkbox
					checked={auth.rememberStoreChoice}
					onchange={(v) => auth.setRememberStoreChoice(v)}
				/>
				<span>Remember my choice (skip this at login)</span>
			</label>
		</div>
	</Popover>
{/if}

<style>
	.store-pop {
		width: 320px;
		max-width: 90vw;
		padding: var(--space-3);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		max-height: 320px;
		overflow-y: auto;
	}
	li button {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		width: 100%;
		min-height: 44px;
		padding: 0 var(--space-2);
		border: 0;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--text-primary);
		font: inherit;
		text-align: start;
		cursor: pointer;
	}
	li button:hover:not(:disabled) {
		background: var(--hover-overlay);
	}
	li button:disabled {
		cursor: not-allowed;
		color: var(--text-disabled);
	}
	li button.current {
		font-weight: 600;
	}
	.name {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.code {
		font-size: 12px;
		color: var(--text-secondary);
	}
	.tag {
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-secondary);
		border: 1px solid var(--border-default);
		border-radius: var(--radius-pill);
		padding: 1px 6px;
	}
	.tag.warn {
		color: var(--state-warning);
		border-color: var(--state-warning);
	}
	.none {
		padding: var(--space-3);
		color: var(--text-secondary);
		text-align: center;
	}
	.remember {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		font-size: 13px;
		color: var(--text-secondary);
		border-top: 1px solid var(--divider);
		padding-top: var(--space-2);
	}
</style>
