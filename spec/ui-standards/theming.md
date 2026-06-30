# UI Standards — Theming & Colour

> Concrete colour tokens for **light and dark** themes, so every implementation looks
> consistent. Implementations must theme via these **semantic tokens**, never by hard-coding
> raw hex at call sites. Light values are taken from the current app's brand palette
> (`theme.ts`); dark values are a designed counterpart — a sensible baseline to refine, not a
> shipped standard. All pairings target the contrast rules in
> [accessibility](./accessibility.md#compliance-and-contrast).

## Principles

1. **Semantic tokens only.** Components reference roles (`surface`, `text.primary`,
   `border.default`, `state.error`) — not `#e95c30`. Swapping the theme swaps the token values;
   call sites don't change.
2. **Two themes minimum:** light and dark, with identical token sets. A rewrite must support
   both even though the current app ships light only.
3. **Mode selection:** follow the OS preference (`prefers-color-scheme`) by default, with a
   manual override the user can set, persisted per user (alongside the language preference —
   see [chrome](../chrome/01-behaviours.md)).
4. **Brand is constant:** the orange brand accent and the blue secondary read as "mSupply" in
   both themes; only their tints shift for contrast.
5. **Never colour-alone:** colour always pairs with text/icon/shape
   ([colour independence](./accessibility.md#colour-independence)). Tokens are for emphasis,
   not the sole carrier of meaning.

## Brand

| Token | Role | Light | Dark |
|-------|------|-------|------|
| `brand.primary` | Primary actions, active nav, focus | `#E95C30` | `#F2774B` |
| `brand.primaryHover` | Hover/pressed primary | `#C43C11` | `#E95C30` |
| `brand.primarySubtle` | Tinted primary background | `#FCEAE3` | `rgba(233,92,48,0.16)` |
| `brand.onPrimary` | Text/icon on primary | `#FFFFFF` | `#FFFFFF` |
| `brand.secondary` | Secondary/links/info accents | `#3E7BFA` | `#6B9BFF` |
| `brand.secondaryHover` | Hover secondary | `#3568D4` | `#3E7BFA` |
| `brand.secondarySubtle` | Tinted secondary background | `#E8F1FE` | `rgba(62,123,250,0.18)` |

## Surfaces

| Token | Role | Light | Dark |
|-------|------|-------|------|
| `surface.base` | App background (behind everything) | `#F2F2F5` | `#16161D` |
| `surface.default` | Cards, tables, panels | `#FFFFFF` | `#1F2029` |
| `surface.raised` | Modals, popovers, menus | `#FFFFFF` | `#262732` |
| `surface.sunken` | Inputs, wells | `#FAFAFC` | `#14141A` |
| `surface.nav` | Drawer / footer / nav chrome | `#F2F2F5` | `#1A1B23` |
| `surface.scrim` | Modal backdrop overlay | `rgba(0,0,0,0.5)` | `rgba(0,0,0,0.6)` |

## Text

| Token | Role | Light | Dark |
|-------|------|-------|------|
| `text.primary` | Default body / headings | `#1C1C28` | `#F2F2F5` |
| `text.secondary` | Labels, captions, helper | `#555770` | `#A4A7B5` |
| `text.disabled` | Disabled / placeholder | `#8F90A6` | `#6A6D7E` |
| `text.link` | Hyperlinks | `#3568D4` | `#6B9BFF` |
| `text.inverse` | On dark/brand fills | `#FFFFFF` | `#16161D` |

## Borders & dividers

| Token | Role | Light | Dark |
|-------|------|-------|------|
| `border.default` | Input/card borders | `#E4E4EB` | `#33343F` |
| `border.strong` | Emphasis borders, table header rule | `#CBCED4` | `#454654` |
| `divider` | Hairline separators | `#EAEAEA` | `#2A2B36` |

## State colours

Each state has a `main` (for icon/text/border/indicator) and a `subtle` tinted background. Pair
with text/icon per colour-independence.

| Token | Role | Light main | Light subtle | Dark main | Dark subtle |
|-------|------|-----------|--------------|-----------|-------------|
| `state.error` | Errors, destructive, reduced-below-zero | `#E63535` | `#FFCDCE` | `#FF6B6B` | `rgba(230,53,53,0.18)` |
| `state.warning` | Warnings, near-expiry, needs-attention | `#E1A200` | `#FCF1D4` | `#F2B43C` | `rgba(225,162,0,0.18)` |
| `state.success` | Success, functioning, finalised-ok | `#69A607` | `#EDF7ED` | `#8FCB3A` | `rgba(105,166,7,0.18)` |
| `state.info` | Informational | `#3E7BFA` | `#E8F1FE` | `#6B9BFF` | `rgba(62,123,250,0.18)` |

> Domain status palettes that ride on these (e.g. VVM stages green/amber/red, cold-chain
> hot/cold) map onto `state.*` and must keep their text/icon labels.

## Interaction

| Token | Role | Light | Dark |
|-------|------|-------|------|
| `focusRing` | Focus-visible outline (2px, 2px offset) | `#E95C30` | `#F2774B` |
| `hoverOverlay` | Row/control hover wash | `rgba(0,0,0,0.04)` | `rgba(255,255,255,0.06)` |
| `selected` | Selected table row tint | `#E8F1FE` | `rgba(62,123,250,0.24)` |
| `selectedHover` | Hover on selected row | `#D2DFFF` | `rgba(62,123,250,0.32)` |

## Spacing, radius & elevation

Non-colour design tokens. Like the colour roles, these are referenced semantically so spacing,
rounding and shadow stay consistent across screens and don't drift between implementations.
These values do **not** change between light and dark. ⚠️ VERIFY the exact scale against the
upstream UI Standards; the values below are the rewrite's working set, aligned with the field
radius (6px) and row heights already fixed in [inputs](./inputs.md) and [tables](./tables.md).

**Spacing** — a 4px base step: `4, 8, 12, 16, 24, 32, 48`. Use steps, not arbitrary pixels.

**Radius** — `sm 4px` · `default 6px` (inputs, buttons, cards) · `lg 10px` (modals) ·
`pill` (badges, toggles, segmented controls).

**Elevation** — surfaces stack via shadow + the `surface.*` tokens, not colour alone:
`popover` (menus/dropdowns/popovers) and `modal` (dialogs) are the two defined levels; flat
surfaces (cards, tables) use a border instead of a shadow.

## Applying the tokens

- **Tables:** `surface.default` background, `border.strong` header rule, `selected`/
  `selectedHover` for selection, `state.error` for invalid cells — see
  [tables](./tables.md#selection).
- **Inputs:** `surface.sunken` fill, `border.default` → `focusRing` on focus — see
  [inputs](./inputs.md#field-sizing-and-states).
- **Chrome:** `surface.nav` for drawer/footer; `brand.primary` for the active nav item.

## Status of the dark values

The dark hexes are a **proposed baseline**. Before they're treated as authoritative, run a
contrast pass (`text.*` on each `surface.*`, and `state.*` on `*.subtle`) against the AA
thresholds in [accessibility](./accessibility.md#compliance-and-contrast) and adjust. The token
*names* and *structure* are the stable part; the exact dark hexes are expected to be tuned.
