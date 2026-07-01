# Theme — Dark

> Colour values for the **dark** theme. Roles/scales/notation: see the [theming model](./theming.md). **Proposed baseline** — the structure is stable, the exact hexes are expected to be tuned (the current app ships no dark theme). Metrics come from the model, with one per-theme choice: this theme rounds **buttons** at `radius.control` — a moderate, consistent rounding, not a pill ([button radius](./theming.md#radius-scale)). Values are hex, or `hex @ opacity%` for translucency (no CSS).

## Brand

| Role | Value |
|------|-------|
| `brand.primary` | `#F2774B` |
| `brand.primaryHover` | `#E95C30` |
| `brand.primarySubtle` | `#E95C30 @ 16%` |
| `brand.onPrimary` | `#FFFFFF` |
| `brand.secondary` | `#6B9BFF` |
| `brand.secondaryHover` | `#3E7BFA` |
| `brand.secondarySubtle` | `#3E7BFA @ 18%` |

## Surface

| Role | Value |
|------|-------|
| `surface.base` | `#16161D` |
| `surface.default` | `#1F2029` |
| `surface.raised` | `#262732` |
| `surface.sunken` | `#14141A` |
| `surface.nav` | `#1A1B23` |
| `surface.scrim` | `#000000 @ 60%` |

## Text

| Role | Value |
|------|-------|
| `text.primary` | `#F2F2F5` |
| `text.secondary` | `#A4A7B5` |
| `text.disabled` | `#6A6D7E` |
| `text.link` | `#6B9BFF` |
| `text.inverse` | `#16161D` |

## Line

| Role | Value |
|------|-------|
| `border.default` | `#33343F` |
| `border.strong` | `#454654` |
| `divider` | `#2A2B36` |

## State

| Role | `main` | `subtle` |
|------|--------|----------|
| `state.error` | `#FF6B6B` | `#E63535 @ 18%` |
| `state.warning` | `#F2B43C` | `#E1A200 @ 18%` |
| `state.success` | `#8FCB3A` | `#69A607 @ 18%` |
| `state.info` | `#6B9BFF` | `#3E7BFA @ 18%` |

## Interaction

| Role | Value |
|------|-------|
| `focusRing` | `#F2774B` |
| `hoverOverlay` | `#FFFFFF @ 6%` |
| `selected` | `#3E7BFA @ 24%` |
| `selectedHover` | `#3E7BFA @ 32%` |

## To validate

Run a contrast pass before treating these as authoritative: every `text.*` on each `surface.*`, and each `state.*` `main` on its `subtle`, against the AA thresholds in [accessibility](./accessibility.md#compliance-and-contrast). Adjust values, keep the roles.
