<script lang="ts">
	import AppShell from '$lib/chrome/AppShell.svelte';
	let { children } = $props();
</script>

<AppShell>
	{@render children()}
</AppShell>
