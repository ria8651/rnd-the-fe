<script lang="ts">
	import { page } from '$app/state';
	import { chrome } from './chrome.svelte';
	import { navGroups, isActive, type NavItem } from './nav-config';

	const visibleGroups = $derived(
		navGroups.map((g) => ({
			...g,
			items: g.items.filter((i) => !i.visible || i.visible())
		}))
	);
</script>

<nav class="sidebar" class:collapsed={chrome.collapsed} aria-label="Primary">
	<div class="head">
		<span class="brand" aria-hidden="true">m+</span>
		{#if !chrome.collapsed}<span class="brand-label">open mSupply</span>{/if}
		<button
			class="toggle"
			type="button"
			aria-label={chrome.collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
			aria-expanded={!chrome.collapsed}
			onclick={() => chrome.toggle()}
		>
			{chrome.collapsed ? '»' : '«'}
		</button>
	</div>

	{#snippet group(items: NavItem[], scroll: boolean)}
		<ul class:scroll>
			{#each items as item (item.route)}
				{@const active = isActive(item.route, page.url.pathname)}
				<li>
					<a
						href={item.route}
						class:active
						aria-current={active ? 'page' : undefined}
						title={chrome.collapsed ? item.label : undefined}
					>
						<span class="icon" aria-hidden="true">{item.icon}</span>
						{#if !chrome.collapsed}<span class="label">{item.label}</span>{/if}
					</a>
				</li>
			{/each}
		</ul>
	{/snippet}

	{@render group(visibleGroups[0].items, true)}
	<div class="spacer"></div>
	{@render group(visibleGroups[1].items, false)}
</nav>

<style>
	.sidebar {
		display: flex;
		flex-direction: column;
		width: 240px;
		flex: none;
		background: var(--surface-nav);
		border-inline-end: 1px solid var(--border-default);
		transition: width var(--transition);
		overflow: hidden;
	}
	.sidebar.collapsed {
		width: 64px;
	}
	.head {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		height: 56px;
		padding: 0 var(--space-3);
		flex: none;
	}
	.brand {
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		flex: none;
		border-radius: var(--radius);
		background: var(--brand-primary);
		color: var(--brand-on-primary);
		font-weight: 700;
	}
	.brand-label {
		font-weight: 600;
		flex: 1;
		white-space: nowrap;
	}
	.toggle {
		margin-inline-start: auto;
		width: 32px;
		height: 32px;
		border: 0;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;
	}
	.toggle:hover {
		background: var(--hover-overlay);
	}
	ul {
		list-style: none;
		margin: 0;
		padding: var(--space-2);
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	ul.scroll {
		overflow-y: auto;
	}
	.spacer {
		flex: 1;
	}
	a {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		min-height: 44px;
		padding: 0 var(--space-3);
		border-radius: var(--radius);
		color: var(--text-primary);
		text-decoration: none;
		white-space: nowrap;
	}
	a:hover {
		background: var(--hover-overlay);
	}
	a.active {
		background: var(--brand-primary-subtle);
		color: var(--brand-primary);
		font-weight: 600;
	}
	.icon {
		width: 24px;
		text-align: center;
		flex: none;
	}
	.collapsed a {
		justify-content: center;
		padding: 0;
	}
</style>
