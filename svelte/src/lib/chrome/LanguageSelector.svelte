<script lang="ts">
	import Popover from '$lib/ui/Popover.svelte';
	import Icon from '$lib/icons/Icon.svelte';
	import { i18n } from '$lib/i18n/i18n.svelte';

	let open = $state(false);

	function select(code: string) {
		if (code === i18n.code) return; // current is not selectable (AC-CH10)
		// reloadOnChange off in dev (no string catalogues yet); the spec contract is reload.
		i18n.setLanguage(code, false);
		open = false;
	}
</script>

<Popover bind:open placement="top-start">
	{#snippet trigger()}
		<button
			class="bar-control"
			data-popover-trigger
			type="button"
			aria-haspopup="listbox"
			aria-expanded={open}
			onclick={() => (open = !open)}
		>
			<Icon name="translate" size={18} />
			<span class="label">{i18n.current.name}</span>
		</button>
	{/snippet}

	<ul class="lang-pop" role="listbox" aria-label="Language">
		{#each i18n.languages as lang (lang.code)}
			<li>
				<button
					type="button"
					role="option"
					aria-selected={lang.code === i18n.code}
					class:current={lang.code === i18n.code}
					disabled={lang.code === i18n.code}
					onclick={() => select(lang.code)}
				>
					<span style:direction={lang.rtl ? 'rtl' : 'ltr'}>{lang.name}</span>
					{#if lang.code === i18n.code}<span class="check" aria-hidden="true">✓</span>{/if}
				</button>
			</li>
		{/each}
	</ul>
</Popover>

<style>
	.lang-pop {
		list-style: none;
		margin: 0;
		padding: var(--space-1);
		min-width: 200px;
	}
	li button {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		min-height: 44px;
		padding: 0 var(--space-3);
		border: 0;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--text-primary);
		font: inherit;
		text-align: start;
		cursor: pointer;
	}
	li button:hover:not(:disabled) {
		background: var(--hover-overlay);
	}
	li button.current {
		font-weight: 600;
		cursor: default;
	}
	.check {
		color: var(--brand-primary);
	}
</style>
