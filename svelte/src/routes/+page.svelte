<script lang="ts">
	import ThemeToggle from '$lib/theme/ThemeToggle.svelte';
	import { theme } from '$lib/theme/theme.svelte';
	import { colorTokens, tokenGroups, type ColorTokenName } from '$lib/theme/tokens';
	import {
		formatDate,
		formatDateTime,
		formatNumber,
		formatCurrency,
		formatPercent,
		formatDelta
	} from '$lib/format';

	const groups = tokenGroups.map((g) => ({
		...g,
		tokens: (Object.keys(colorTokens) as ColorTokenName[]).filter((n) => n.startsWith(g.prefix))
	}));

	const samples = [
		{ label: 'Date (DD/MM/YYYY)', value: formatDate('2028-05-03') },
		{ label: 'Date + time', value: formatDateTime('2026-07-01T14:08:00') },
		{ label: 'Number (thousands)', value: formatNumber(2000) },
		{ label: 'Currency (2 dp)', value: formatCurrency(240) },
		{ label: 'Percentage (1 dp)', value: formatPercent(95.5) },
		{ label: 'Delta (positive)', value: formatDelta(12) },
		{ label: 'Delta (negative)', value: formatDelta(-340) },
		{ label: 'Delta (zero)', value: formatDelta(0) }
	];
</script>

<div class="page">
	<header>
		<div>
			<p class="eyebrow">
				open-mSupply · Svelte rebuild · <a href="/gallery">UI primitives →</a> ·
				<a href="/dashboard">App shell →</a>
			</p>
			<h1>Stage 1 — Foundation</h1>
			<p class="sub">
				Design tokens, typography and value formatting from the
				<code>ui-standards</code> spec. Resolved theme:
				<strong>{theme.resolved}</strong>
				(mode: {theme.mode}).
			</p>
		</div>
		<ThemeToggle />
	</header>

	{#each groups as group (group.title)}
		<section>
			<h2>{group.title}</h2>
			<div class="swatches">
				{#each group.tokens as name (name)}
					<figure>
						<div class="chip" style="background: var({name})" aria-hidden="true"></div>
						<figcaption>
							<code>{name}</code>
							<span class="role">{colorTokens[name].role}</span>
						</figcaption>
					</figure>
				{/each}
			</div>
		</section>
	{/each}

	<section>
		<h2>Typography</h2>
		<div class="panel type-samples">
			<p style="font-size:24px;font-weight:600">Heading — 24 / 600</p>
			<p style="font-size:18px;font-weight:600">Subheading — 18 / 600</p>
			<p style="font-size:var(--font-size-header);font-weight:var(--weight-header)">
				Table header — 14 / 600
			</p>
			<p style="font-size:var(--font-size-cell);font-weight:var(--weight-regular)">
				Table cell — 14 / 400. Headers differ from cells by weight, not colour or size.
			</p>
			<p style="font-size:var(--font-size-cell-touch);line-height:var(--line-height-touch)">
				Tablet cell — 16 / 24, for touch counting.
			</p>
			<p class="label-sample">Uppercase field label — 11px</p>
		</div>
	</section>

	<section>
		<h2>Value formatting</h2>
		<div class="panel">
			<dl class="formats">
				{#each samples as s (s.label)}
					<div>
						<dt>{s.label}</dt>
						<dd class="tabular">{s.value}</dd>
					</div>
				{/each}
			</dl>
			<p class="note">All numerics use tabular figures so digit columns align.</p>
		</div>
	</section>
</div>

<style>
	.page {
		max-width: 1080px;
		margin: 0 auto;
		padding: var(--space-6) var(--space-5) var(--space-7);
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--space-5);
		flex-wrap: wrap;
		margin-bottom: var(--space-6);
	}
	.eyebrow {
		margin: 0 0 var(--space-1);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-size: var(--font-size-label);
		color: var(--text-secondary);
	}
	h1 {
		margin: 0 0 var(--space-2);
	}
	.sub {
		margin: 0;
		color: var(--text-secondary);
		max-width: 60ch;
	}
	code {
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 12px;
		background: var(--surface-sunken);
		border: 1px solid var(--border-default);
		border-radius: var(--radius-sm);
		padding: 1px 5px;
	}
	section {
		margin-bottom: var(--space-6);
	}
	.swatches {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: var(--space-3);
	}
	figure {
		margin: 0;
		display: flex;
		gap: var(--space-3);
		align-items: center;
		background: var(--surface-default);
		border: 1px solid var(--border-default);
		border-radius: var(--radius);
		padding: var(--space-2);
	}
	.chip {
		width: 44px;
		height: 44px;
		flex: none;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-strong);
	}
	figcaption {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}
	.role {
		font-size: 12px;
		color: var(--text-secondary);
	}
	.panel {
		background: var(--surface-default);
		border: 1px solid var(--border-default);
		border-radius: var(--radius);
		padding: var(--space-5);
	}
	.type-samples p {
		margin: 0 0 var(--space-3);
	}
	.label-sample {
		text-transform: uppercase;
		letter-spacing: 0.06em;
		font-size: var(--font-size-label);
		color: var(--text-secondary);
	}
	.formats {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: var(--space-4);
		margin: 0;
	}
	.formats dt {
		font-size: 12px;
		color: var(--text-secondary);
		margin-bottom: 2px;
	}
	.formats dd {
		margin: 0;
		font-size: 18px;
		font-weight: 600;
	}
	.note {
		margin: var(--space-4) 0 0;
		color: var(--text-secondary);
		font-size: 13px;
	}
</style>
