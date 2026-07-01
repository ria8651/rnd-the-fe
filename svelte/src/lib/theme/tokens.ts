/**
 * Semantic design tokens — the single source of truth for colour.
 *
 * Mirrors spec/ui-standards/theming.md. Components reference these by *role*
 * (via the generated CSS custom properties, e.g. `var(--surface-default)`),
 * never by raw hex. Swapping the theme swaps the values; call sites don't change.
 *
 * Each token carries a `light` and a `dark` value. The light values come from the
 * current app's brand palette; the dark values are the spec's proposed baseline
 * (still to be contrast-tuned — see theming.md "Status of the dark values").
 *
 * After editing this file, regenerate the CSS with:  `pnpm tokens`
 */

export interface TokenValue {
	light: string;
	dark: string;
	/** The existing-app (MUI) theme — see spec theme-mui.md. Defaults to the light
	 *  value (the light theme is derived from MUI); only set where MUI differs. */
	mui?: string;
	/** Short description of the token's role (kept for docs / the theme preview). */
	role: string;
}

export const colorTokens = {
	// ── Brand ────────────────────────────────────────────────────────────────
	'--brand-primary': { role: 'Primary actions, active nav, focus', light: '#E95C30', dark: '#F2774B' },
	'--brand-primary-hover': { role: 'Hover/pressed primary', light: '#C43C11', dark: '#E95C30' },
	'--brand-primary-subtle': { role: 'Tinted primary background', light: '#FCEAE3', dark: 'rgba(233,92,48,0.16)' },
	'--brand-on-primary': { role: 'Text/icon on primary', light: '#FFFFFF', dark: '#FFFFFF' },
	'--brand-secondary': { role: 'Secondary/links/info accents', light: '#3E7BFA', dark: '#6B9BFF' },
	'--brand-secondary-hover': { role: 'Hover secondary', light: '#3568D4', dark: '#3E7BFA' },
	'--brand-secondary-subtle': { role: 'Tinted secondary background', light: '#E8F1FE', dark: 'rgba(62,123,250,0.18)' },

	// ── Surfaces ─────────────────────────────────────────────────────────────
	'--surface-base': { role: 'App background (behind everything)', light: '#F2F2F5', dark: '#16161D' },
	'--surface-default': { role: 'Cards, tables, panels', light: '#FFFFFF', dark: '#1F2029' },
	'--surface-raised': { role: 'Modals, popovers, menus', light: '#FFFFFF', dark: '#262732' },
	'--surface-sunken': { role: 'Inputs, wells', light: '#FAFAFC', dark: '#14141A' },
	'--surface-nav': { role: 'Drawer / footer / nav chrome', light: '#F2F2F5', dark: '#1A1B23' },
	'--surface-scrim': { role: 'Modal backdrop overlay', light: 'rgba(0,0,0,0.5)', dark: 'rgba(0,0,0,0.6)' },

	// ── Text ─────────────────────────────────────────────────────────────────
	'--text-primary': { role: 'Default body / headings', light: '#1C1C28', dark: '#F2F2F5' },
	'--text-secondary': { role: 'Labels, captions, helper', light: '#555770', dark: '#A4A7B5' },
	'--text-disabled': { role: 'Disabled / placeholder', light: '#8F90A6', dark: '#6A6D7E' },
	'--text-link': { role: 'Hyperlinks', light: '#3568D4', dark: '#6B9BFF' },
	'--text-inverse': { role: 'On dark/brand fills', light: '#FFFFFF', dark: '#16161D' },

	// ── Borders & dividers ───────────────────────────────────────────────────
	'--border-default': { role: 'Input/card borders', light: '#E4E4EB', dark: '#33343F' },
	'--border-strong': { role: 'Emphasis borders, table header rule', light: '#CBCED4', dark: '#454654' },
	'--divider': { role: 'Hairline separators', light: '#EAEAEA', dark: '#2A2B36' },

	// ── State ────────────────────────────────────────────────────────────────
	'--state-error': { role: 'Errors, destructive, reduced-below-zero', light: '#E63535', dark: '#FF6B6B' },
	'--state-error-subtle': { role: 'Error tinted background', light: '#FFCDCE', dark: 'rgba(230,53,53,0.18)' },
	'--state-warning': { role: 'Warnings, near-expiry', light: '#E1A200', dark: '#F2B43C', mui: '#F2A001' },
	'--state-warning-subtle': { role: 'Warning tinted background', light: '#FCF1D4', dark: 'rgba(225,162,0,0.18)' },
	'--state-success': { role: 'Success, functioning, finalised-ok', light: '#69A607', dark: '#8FCB3A' },
	'--state-success-subtle': { role: 'Success tinted background', light: '#EDF7ED', dark: 'rgba(105,166,7,0.18)' },
	'--state-info': { role: 'Informational', light: '#3E7BFA', dark: '#6B9BFF' },
	'--state-info-subtle': { role: 'Info tinted background', light: '#E8F1FE', dark: 'rgba(62,123,250,0.18)' },

	// ── Interaction ──────────────────────────────────────────────────────────
	'--focus-ring': { role: 'Focus-visible outline (2px, 2px offset)', light: '#E95C30', dark: '#F2774B' },
	'--hover-overlay': { role: 'Row/control hover wash', light: 'rgba(0,0,0,0.04)', dark: 'rgba(255,255,255,0.06)' },
	'--selected': { role: 'Selected table row tint', light: '#E8F1FE', dark: 'rgba(62,123,250,0.24)' },
	'--selected-hover': { role: 'Hover on selected row', light: '#D2DFFF', dark: 'rgba(62,123,250,0.32)' }
} satisfies Record<string, TokenValue>;

export type ColorTokenName = keyof typeof colorTokens;

/** Logical grouping for the theme-preview page. */
export const tokenGroups: { title: string; prefix: string }[] = [
	{ title: 'Brand', prefix: '--brand-' },
	{ title: 'Surfaces', prefix: '--surface-' },
	{ title: 'Text', prefix: '--text-' },
	{ title: 'Borders & dividers', prefix: '--border-' },
	{ title: 'State', prefix: '--state-' },
	{ title: 'Interaction', prefix: '--focus-' }
];
