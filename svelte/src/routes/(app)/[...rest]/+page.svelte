<script lang="ts">
	import { page } from '$app/state';
	import { navGroups } from '$lib/chrome/nav-config';

	// Generic placeholder for nav destinations not yet built, so the chrome is fully
	// navigable. Specific routes (dashboard, stocktakes) take precedence over this.
	const label = $derived(
		navGroups
			.flatMap((g) => g.items)
			.find((i) => i.route === '/' + page.params.rest)?.label ?? page.params.rest
	);
</script>

<h1 style="text-transform: capitalize">{label}</h1>
<p class="note">This section isn't part of the current spec scope — placeholder only.</p>

<style>
	.note {
		color: var(--text-secondary);
	}
</style>
