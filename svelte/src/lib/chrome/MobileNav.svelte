<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import Modal from '$lib/ui/Modal.svelte';
	import Button from '$lib/ui/Button.svelte';
	import { auth } from '$lib/auth/auth.svelte';
	import { navGroups, isActive } from './nav-config';

	let open = $state(false);
	let confirmingLogout = $state(false);

	const allItems = $derived(
		navGroups.flatMap((g) => g.items).filter((i) => !i.visible || i.visible())
	);

	const crumb = $derived(
		allItems.find((i) => isActive(i.route, page.url.pathname))?.label ?? 'open mSupply'
	);

	function navigate(route: string) {
		open = false;
		goto(route);
	}
	function confirmLogout() {
		confirmingLogout = false;
		auth.logout();
		goto('/login');
	}
</script>

<div class="topbar">
	<button
		class="menu-toggle"
		type="button"
		aria-label={open ? 'Close menu' : 'Open menu'}
		aria-expanded={open}
		onclick={() => (open = !open)}
	>
		{open ? '✕' : '☰'}
	</button>
	<span class="crumb">{crumb}</span>
	<span class="brand" aria-hidden="true">m+</span>
</div>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="drawer-scrim" onclick={() => (open = false)}></div>
	<nav class="drawer" aria-label="Primary">
		<ul>
			{#each allItems as item (item.route)}
				<li>
					<a
						href={item.route}
						class:active={isActive(item.route, page.url.pathname)}
						onclick={(e) => {
							e.preventDefault();
							navigate(item.route);
						}}
					>
						<span class="icon" aria-hidden="true">{item.icon}</span>{item.label}
					</a>
				</li>
			{/each}
			<li class="sep"></li>
			<li>
				<a href="https://docs.msupply.foundation" target="_blank" rel="noopener">
					<span class="icon" aria-hidden="true">📖</span>Docs ↗
				</a>
			</li>
			<li>
				<button type="button" onclick={() => (confirmingLogout = true)}>
					<span class="icon" aria-hidden="true">🚪</span>Log out
				</button>
			</li>
		</ul>
	</nav>
{/if}

<Modal bind:open={confirmingLogout} title="Log out?" width="400px">
	Are you sure you want to log out?
	{#snippet footer()}
		<Button variant="ghost" onclick={() => (confirmingLogout = false)}>Cancel</Button>
		<Button variant="primary" onclick={confirmLogout}>Log out</Button>
	{/snippet}
</Modal>

<style>
	.topbar {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		height: 56px;
		padding: 0 var(--space-3);
		background: var(--surface-nav);
		border-bottom: 1px solid var(--border-default);
	}
	.menu-toggle {
		width: var(--touch-target);
		height: var(--touch-target);
		border: 0;
		background: transparent;
		color: var(--text-primary);
		font-size: 20px;
		cursor: pointer;
		border-radius: var(--radius-sm);
	}
	.crumb {
		flex: 1;
		font-weight: 600;
	}
	.brand {
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border-radius: var(--radius);
		background: var(--brand-primary);
		color: var(--brand-on-primary);
		font-weight: 700;
	}
	.drawer-scrim {
		position: fixed;
		inset: 56px 0 0;
		background: var(--surface-scrim);
		z-index: var(--z-sidebar);
	}
	.drawer {
		position: fixed;
		top: 56px;
		inset-inline: 0;
		max-height: calc(100vh - 56px);
		overflow-y: auto;
		background: var(--surface-raised);
		border-bottom: 1px solid var(--border-default);
		box-shadow: var(--shadow-popover);
		z-index: var(--z-sidebar);
		animation: slide-down var(--transition);
	}
	@keyframes slide-down {
		from {
			transform: translateY(-8px);
			opacity: 0;
		}
	}
	ul {
		list-style: none;
		margin: 0;
		padding: var(--space-2);
	}
	.sep {
		height: 1px;
		background: var(--divider);
		margin: var(--space-2) 0;
	}
	a,
	li button {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		width: 100%;
		min-height: var(--touch-target);
		padding: 0 var(--space-3);
		border: 0;
		background: transparent;
		border-radius: var(--radius);
		color: var(--text-primary);
		text-decoration: none;
		font: inherit;
		text-align: start;
		cursor: pointer;
	}
	a:hover,
	li button:hover {
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
	}
</style>
