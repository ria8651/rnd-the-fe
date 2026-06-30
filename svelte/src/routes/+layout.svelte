<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { theme } from '$lib/theme/theme.svelte';

	let { children } = $props();

	// Resolve theme on mount (browser only — SSR is disabled for this SPA).
	onMount(() => theme.init());
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
