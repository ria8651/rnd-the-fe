/**
 * Semantic colour tokens — the single source of truth for colour, mirroring
 * spec/ui-standards/theming.md (roles) and the theme variants (values):
 *   - light  → spec/ui-standards/theme-light.md
 *   - dark   → spec/ui-standards/theme-dark.md   (proposed baseline)
 *   - mui    → spec/ui-standards/theme-mui.md     (existing-app reference)
 *
 * Values are kept in the spec's own notation: a 6-digit hex, or `#RRGGBB @ NN%` for a
 * translucent colour. `scripts/gen-tokens.ts` converts these to CSS custom properties in
 * theme/tokens.css. Components reference roles via `var(--surface-default)` etc. — never a
 * raw hex — so swapping the theme swaps the values and call sites don't change.
 *
 * After editing this file, regenerate the CSS with:  `pnpm tokens`
 */

export interface TokenValue {
  /** One-line description of the role (kept for docs / the theme preview page). */
  role: string;
  light: string;
  dark: string;
  /** Existing-app (MUI) value. Defaults to `light` (light is derived from MUI) — set
   *  only where MUI genuinely differs. */
  mui?: string;
}

export const colorTokens = {
  // ── Brand ──────────────────────────────────────────────────────────────────
  '--brand-primary': { role: 'Primary actions, active nav, focus', light: '#E95C30', dark: '#F2774B' },
  '--brand-primary-hover': { role: 'Hover/pressed primary', light: '#C43C11', dark: '#E95C30' },
  '--brand-primary-subtle': { role: 'Tinted primary background', light: '#FCEAE3', dark: '#E95C30 @ 16%' },
  '--brand-on-primary': { role: 'Text/icon on primary fill', light: '#FFFFFF', dark: '#FFFFFF' },
  '--brand-secondary': { role: 'Secondary / links / info accents', light: '#3E7BFA', dark: '#6B9BFF' },
  '--brand-secondary-hover': { role: 'Hover secondary', light: '#3568D4', dark: '#3E7BFA' },
  '--brand-secondary-subtle': { role: 'Tinted secondary background', light: '#E8F1FE', dark: '#3E7BFA @ 18%' },

  // ── Surfaces ───────────────────────────────────────────────────────────────
  '--surface-base': { role: 'App background', light: '#F2F2F5', dark: '#16161D' },
  '--surface-default': { role: 'Cards, tables, panels', light: '#FFFFFF', dark: '#1F2029' },
  '--surface-raised': { role: 'Modals, popovers, menus', light: '#FFFFFF', dark: '#262732' },
  '--surface-sunken': { role: 'Inputs, wells, row stripes', light: '#FAFAFC', dark: '#14141A' },
  '--surface-nav': { role: 'Drawer / footer / nav chrome', light: '#F2F2F5', dark: '#1A1B23' },
  '--surface-scrim': { role: 'Modal backdrop overlay', light: '#000000 @ 50%', dark: '#000000 @ 60%' },

  // ── Text ───────────────────────────────────────────────────────────────────
  '--text-primary': { role: 'Default body / headings', light: '#1C1C28', dark: '#F2F2F5' },
  '--text-secondary': { role: 'Labels, captions, helper', light: '#555770', dark: '#A4A7B5' },
  '--text-disabled': { role: 'Disabled / placeholder', light: '#8F90A6', dark: '#6A6D7E' },
  '--text-link': { role: 'Hyperlinks', light: '#3568D4', dark: '#6B9BFF' },
  '--text-inverse': { role: 'On dark/brand fills', light: '#FFFFFF', dark: '#16161D' },

  // ── Line ───────────────────────────────────────────────────────────────────
  '--border-default': { role: 'Input/card borders', light: '#E4E4EB', dark: '#33343F' },
  '--border-strong': { role: 'Emphasis borders, header rule', light: '#CBCED4', dark: '#454654' },
  '--divider': { role: 'Hairline separators', light: '#EAEAEA', dark: '#2A2B36' },

  // ── State ──────────────────────────────────────────────────────────────────
  '--state-error': { role: 'Errors, destructive, below-zero', light: '#E63535', dark: '#FF6B6B' },
  '--state-error-subtle': { role: 'Error tinted background', light: '#FFCDCE', dark: '#E63535 @ 18%' },
  '--state-warning': { role: 'Warnings, near-expiry', light: '#E1A200', dark: '#F2B43C', mui: '#F2A001' },
  '--state-warning-subtle': { role: 'Warning tinted background', light: '#FCF1D4', dark: '#E1A200 @ 18%' },
  '--state-success': { role: 'Success, functioning, finalised', light: '#69A607', dark: '#8FCB3A' },
  '--state-success-subtle': { role: 'Success tinted background', light: '#EDF7ED', dark: '#69A607 @ 18%' },
  '--state-info': { role: 'Informational', light: '#3E7BFA', dark: '#6B9BFF' },
  '--state-info-subtle': { role: 'Info tinted background', light: '#E8F1FE', dark: '#3E7BFA @ 18%' },

  // ── Interaction ──────────────────────────────────────────────────────────────
  '--focus-ring': { role: 'Focus-visible outline (2px / 2px offset)', light: '#E95C30', dark: '#F2774B' },
  '--hover-overlay': { role: 'Row/control hover wash', light: '#000000 @ 4%', dark: '#FFFFFF @ 6%' },
  '--selected': { role: 'Selected table row tint', light: '#E8F1FE', dark: '#3E7BFA @ 24%' },
  '--selected-hover': { role: 'Hover on selected row', light: '#D2DFFF', dark: '#3E7BFA @ 32%' }
} satisfies Record<string, TokenValue>;

export type ColorTokenName = keyof typeof colorTokens;

/** Logical grouping for the theme-preview page. */
export const tokenGroups: { title: string; prefix: string }[] = [
  { title: 'Brand', prefix: '--brand-' },
  { title: 'Surfaces', prefix: '--surface-' },
  { title: 'Text', prefix: '--text-' },
  { title: 'Line', prefix: '--border-' },
  { title: 'State', prefix: '--state-' },
  { title: 'Interaction', prefix: '--focus-' }
];
