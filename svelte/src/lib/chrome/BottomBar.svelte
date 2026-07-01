<script lang="ts">
	import StoreSelector from './StoreSelector.svelte';
	import LanguageSelector from './LanguageSelector.svelte';
	import UserMenu from './UserMenu.svelte';
	import Icon from '$lib/icons/Icon.svelte';
	import { auth } from '$lib/auth/auth.svelte';

	// Mock: pretend we're connected to a central server so the indicator shows.
	const centralServer = true;
</script>

<footer class="bottom-bar">
	<div class="group">
		<StoreSelector />
		{#if auth.can('EditStore')}
			<button class="bar-control" type="button" title="Edit store details">
				<Icon name="edit" size={18} />
				<span class="label">Edit store</span>
			</button>
		{/if}
	</div>

	<div class="group end">
		{#if centralServer}
			<span class="central" title="Connected to central server">
				<Icon name="central" size={18} label="Connected to central server" />
				<span class="label">Central</span>
			</span>
		{/if}
		<LanguageSelector />
		<UserMenu />
	</div>
</footer>

<style>
	.bottom-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		padding: 0 var(--space-3);
		min-height: 56px;
		background: var(--surface-nav);
		border-top: 1px solid var(--border-default);
		z-index: var(--z-bottom-bar);
	}
	.group {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}
	.central {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		font-size: 12px;
		color: var(--state-success);
		padding: 0 var(--space-2);
	}
	@media (max-width: 600px) {
		.bottom-bar {
			justify-content: space-around;
			padding: 0;
		}
		.central .label {
			display: none;
		}
	}
</style>
