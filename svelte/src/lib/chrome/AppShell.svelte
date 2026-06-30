<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Sidebar from './Sidebar.svelte';
	import MobileNav from './MobileNav.svelte';
	import BottomBar from './BottomBar.svelte';
	import { chrome } from './chrome.svelte';
	import { auth } from '$lib/auth/auth.svelte';
	import { viewport, BP } from '$lib/ui/viewport.svelte';

	let { children }: { children: Snippet } = $props();

	// Below the tablet-landscape breakpoint we use the mobile top-bar + drawer
	// instead of the sidebar (chrome/00 › Regions).
	const isMobile = $derived(viewport.below(BP.desktop));

	onMount(() => {
		chrome.init();
		auth.init();
	});

	// Auth gate: unauthenticated users are routed to login, not shown the chrome (AC-CH15).
	$effect(() => {
		if (!auth.isAuthenticated && page.url.pathname !== '/login') goto('/login');
	});

	// Responsive sidebar default until the user overrides it (AC-CH2).
	$effect(() => {
		chrome.applyResponsiveDefault(viewport.below(BP.desktop));
	});
</script>

{#if auth.isAuthenticated}
	<div class="shell" class:fullscreen={chrome.fullscreen}>
		{#if !chrome.fullscreen}
			{#if isMobile}
				<MobileNav />
			{:else}
				<Sidebar />
			{/if}
		{/if}

		<div class="main">
			<main>{@render children()}</main>
			{#if !chrome.fullscreen}<BottomBar />{/if}
		</div>
	</div>
{/if}

<style>
	.shell {
		display: flex;
		height: 100vh;
		overflow: hidden;
		background: var(--surface-base);
	}
	/* Mobile: the top bar stacks above content rather than sitting beside it. */
	@media (max-width: 1099px) {
		.shell {
			flex-direction: column;
		}
	}
	.main {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
		min-height: 0;
	}
	main {
		flex: 1;
		overflow: auto;
		padding: var(--space-5);
	}
	.fullscreen main {
		padding: 0;
	}
</style>
