<script lang="ts" module>
	// Eagerly inline every icon SVG as a raw string. They use `currentColor`, so they
	// theme automatically from the surrounding text colour (icons.md › Colour by inheritance).
	// Source of truth: spec/ui-standards/icons — copied here via `pnpm icons` (see scripts).
	const svgs = import.meta.glob('./svg/*.svg', {
		query: '?raw',
		import: 'default',
		eager: true
	}) as Record<string, string>;

	export type IconName = string;

	function lookup(name: string): string | undefined {
		return svgs[`./svg/${name}.svg`];
	}
</script>

<script lang="ts">
	import { i18n } from '$lib/i18n/i18n.svelte';

	let {
		name,
		size = 20,
		label,
		flipRtl = false
	}: {
		name: IconName;
		/** Glyph size in px (icons.md: 16 inline, 20 default, 24 nav). */
		size?: number;
		/** Accessible label; when omitted the icon is decorative (aria-hidden). */
		label?: string;
		/** Directional icons (arrows/chevrons) flip under RTL (icons.md › RTL). */
		flipRtl?: boolean;
	} = $props();

	const svg = $derived(lookup(name));
	const flip = $derived(flipRtl && i18n.rtl);
</script>

<span
	class="icon"
	class:flip
	style:width="{size}px"
	style:height="{size}px"
	role={label ? 'img' : undefined}
	aria-label={label}
	aria-hidden={label ? undefined : 'true'}
>
	{#if svg}{@html svg}{/if}
</span>

<style>
	.icon {
		display: inline-flex;
		flex: none;
		line-height: 0;
		color: inherit;
	}
	.icon.flip :global(svg) {
		transform: scaleX(-1);
	}
	.icon :global(svg) {
		width: 100%;
		height: 100%;
		display: block;
	}
</style>
