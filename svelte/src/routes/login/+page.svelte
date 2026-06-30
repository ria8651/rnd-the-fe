<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/ui/Button.svelte';
	import { auth } from '$lib/auth/auth.svelte';
	import { ROOT_PATH } from '$lib/chrome/nav-config';

	// Stage 3 stub: real login arrives with live GraphQL (Stage 4). This just
	// restores the mock session so the chrome is reachable again after logout.
	function signIn() {
		auth.login();
		goto(ROOT_PATH);
	}
</script>

<div class="login">
	<div class="card">
		<span class="brand" aria-hidden="true">m+</span>
		<h1>open mSupply</h1>
		<p class="note">Mock sign-in for the Stage 3 shell demo. Real authentication lands in Stage 4.</p>
		<Button variant="primary" onclick={signIn}>Sign in</Button>
	</div>
</div>

<style>
	.login {
		min-height: 100vh;
		display: grid;
		place-items: center;
		background: var(--surface-base);
		padding: var(--space-5);
	}
	.card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-3);
		text-align: center;
		max-width: 360px;
		padding: var(--space-6);
		background: var(--surface-default);
		border: 1px solid var(--border-default);
		border-radius: var(--radius-lg);
	}
	.brand {
		display: grid;
		place-items: center;
		width: 48px;
		height: 48px;
		border-radius: var(--radius);
		background: var(--brand-primary);
		color: var(--brand-on-primary);
		font-weight: 700;
		font-size: 20px;
	}
	h1 {
		margin: 0;
	}
	.note {
		margin: 0;
		color: var(--text-secondary);
		font-size: 13px;
	}
</style>
