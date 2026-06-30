<script lang="ts">
	import { goto } from '$app/navigation';
	import Popover from '$lib/ui/Popover.svelte';
	import Modal from '$lib/ui/Modal.svelte';
	import Button from '$lib/ui/Button.svelte';
	import { auth } from '$lib/auth/auth.svelte';

	let open = $state(false);
	let confirmingLogout = $state(false);

	function requestLogout() {
		open = false;
		confirmingLogout = true;
	}

	function confirmLogout() {
		confirmingLogout = false;
		auth.logout();
		goto('/login');
	}
</script>

{#if auth.user}
	<Popover bind:open placement="top-end">
		{#snippet trigger()}
			<button
				class="bar-control"
				data-popover-trigger
				type="button"
				aria-haspopup="dialog"
				aria-expanded={open}
				onclick={() => (open = !open)}
			>
				<span aria-hidden="true">👤</span>
				<span class="label">{auth.user?.firstName} {auth.user?.lastName}</span>
			</button>
		{/snippet}

		<div class="user-pop">
			<p class="name">{auth.user.firstName} {auth.user.lastName}</p>
			<dl>
				<div><dt>Username</dt><dd>{auth.user.username}</dd></div>
				<div><dt>Email</dt><dd>{auth.user.email}</dd></div>
				<div><dt>Job title</dt><dd>{auth.user.jobTitle}</dd></div>
			</dl>
			<Button variant="secondary" onclick={requestLogout}>Log out</Button>
		</div>
	</Popover>

	<Modal bind:open={confirmingLogout} title="Log out?" width="400px">
		Are you sure you want to log out? You'll need to sign in again to continue.
		{#snippet footer()}
			<Button variant="ghost" onclick={() => (confirmingLogout = false)}>Cancel</Button>
			<Button variant="primary" onclick={confirmLogout}>Log out</Button>
		{/snippet}
	</Modal>
{/if}

<style>
	.user-pop {
		width: 260px;
		padding: var(--space-4);
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
	.name {
		margin: 0;
		font-weight: 600;
		font-size: 15px;
	}
	dl {
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	dt {
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-secondary);
	}
	dd {
		margin: 0;
		font-size: 14px;
		word-break: break-word;
	}
</style>
