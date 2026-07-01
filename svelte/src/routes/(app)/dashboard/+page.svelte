<script lang="ts">
	import { auth } from '$lib/auth/auth.svelte';
	import ThemeToggle from '$lib/theme/ThemeToggle.svelte';
</script>

<div class="dash">
	<header>
		<div>
			<p class="eyebrow">{auth.currentStore?.name}</p>
			<h1>Welcome back, {auth.user?.firstName}</h1>
		</div>
		<ThemeToggle />
	</header>

	<p class="lead">
		This is the app shell (Stage 3) — sidebar, bottom bar, store / language / user selectors.
		Pick <strong>Inventory</strong> in the nav to reach the stocktakes vertical (built in the
		next stages).
	</p>

	<div class="cards">
		<a class="card" href="/stocktakes">
			<span class="icon" aria-hidden="true">📦</span>
			<h2>Stocktakes</h2>
			<p>Count and reconcile stock. The first vertical built from the spec.</p>
		</a>
		<div class="card muted">
			<span class="icon" aria-hidden="true">🔄</span>
			<h2>Replenishment</h2>
			<p>Coming soon.</p>
		</div>
		<div class="card muted">
			<span class="icon" aria-hidden="true">🚚</span>
			<h2>Distribution</h2>
			<p>Coming soon.</p>
		</div>
	</div>
</div>

<style>
	.dash {
		max-width: 960px;
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--space-4);
		margin-bottom: var(--space-4);
	}
	.eyebrow {
		margin: 0 0 var(--space-1);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-size: var(--font-size-label);
		color: var(--text-secondary);
	}
	h1 {
		margin: 0;
	}
	.lead {
		color: var(--text-secondary);
		max-width: 60ch;
		margin: 0 0 var(--space-5);
	}
	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: var(--space-4);
	}
	.card {
		display: block;
		padding: var(--space-4);
		background: var(--surface-default);
		border: 1px solid var(--border-default);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-card);
		color: var(--text-primary);
		text-decoration: none;
	}
	.card:hover:not(.muted) {
		border-color: var(--brand-primary);
	}
	.card.muted {
		opacity: 0.6;
	}
	.card h2 {
		margin: var(--space-2) 0 var(--space-1);
		font-size: 16px;
	}
	.card p {
		margin: 0;
		color: var(--text-secondary);
		font-size: 13px;
	}
	.icon {
		font-size: 24px;
	}
</style>
