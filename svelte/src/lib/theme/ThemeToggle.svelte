<script lang="ts">
	import { theme, type ThemeMode } from './theme.svelte';

	const options: { value: ThemeMode; label: string; icon: string }[] = [
		{ value: 'system', label: 'System', icon: '🖥' },
		{ value: 'light', label: 'Light', icon: '☀' },
		{ value: 'dark', label: 'Dark', icon: '🌙' },
		{ value: 'mui', label: 'mSupply', icon: 'm+' }
	];
</script>

<div class="toggle" role="radiogroup" aria-label="Colour theme">
	{#each options as opt (opt.value)}
		<button
			type="button"
			role="radio"
			aria-checked={theme.mode === opt.value}
			class:active={theme.mode === opt.value}
			onclick={() => theme.set(opt.value)}
			title={opt.label}
		>
			<span aria-hidden="true">{opt.icon}</span>
			<span class="label">{opt.label}</span>
		</button>
	{/each}
</div>

<style>
	.toggle {
		display: inline-flex;
		gap: 2px;
		padding: 3px;
		background: var(--surface-sunken);
		border: 1px solid var(--border-default);
		border-radius: var(--radius-pill);
	}
	button {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		min-height: 36px;
		padding: 0 var(--space-3);
		border: 0;
		border-radius: var(--radius-pill);
		background: transparent;
		color: var(--text-secondary);
		font: inherit;
		cursor: pointer;
		transition: background var(--transition-fast), color var(--transition-fast);
	}
	button:hover {
		background: var(--hover-overlay);
	}
	button.active {
		background: var(--brand-primary);
		color: var(--brand-on-primary);
	}
	.label {
		font-size: 13px;
	}
</style>
