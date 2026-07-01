# Theme — Existing (MUI) Reference

> A faithful capture of the **current** open-mSupply app's theme, sourced from its resolved
> styles (the running app) and theme definition. This is the **reference**:
> "what we have today." The [light theme](./theme-light.md) is derived from it; this
> doc is what to diff against and where the current look is non-obvious.
>
> Unlike the model, this snapshot records the app's actual **metrics** (radius/density/type/
> shadow) too — including their inconsistencies — because that is the value of a reference.
> Values are hex / `hex @ opacity%` (no CSS).

## Colours (palette)

| Role | Value | Notes |
|------|-------|-------|
| `brand.primary` | `#E95C30` | brand orange; light `#ED7D59`, dark `#C43C11` |
| `brand.secondary` | `#3E7BFA` | brand blue; also `info`; dark `#3568D4` |
| `text.primary` | `#1C1C28` | body text |
| `text.secondary` | `#555770` | labels, captions, `h6` |
| `text.disabled` | `#8F90A6` | gray.main |
| `button.text` | `#373740` | action-button label colour |
| `surface.base` / nav | `#F2F2F5` | app background, drawer, footer, menus |
| `surface.default` | `#FFFFFF` | cards, tables |
| `surface.row` | `#FAFAFC` | table row background |
| `border.default` | `#E4E4EB` | |
| `border.strong` | `#CBCED4` | table header rule (renders ~`#FCFCFC` on white) |
| `divider` | `#EAEAEA` | |
| `state.error` | `#E63535` | subtle bg `#FFCDCE` |
| `state.success` | `#69A607` | "functioning" |
| `state.warning` | `#F2A001` / `#E1A200` | "needs attention" / pending |
| `state.info` | `#3E7BFA` | |

Domain palettes also present in the current theme (carry over as needed): cold-chain
hot `#DB6974` / cold `#AACAE2`; VVM/status functioning `#69A607`, attention `#F2A001`,
not-functioning `#DE0001`; chart line series `#EED600 #922DD0 #E1A200 #59639C #E500EA #00DBCE`.

## Typography

- **Family:** `Inter Variable`, fallback sans-serif.
- Body: 14px, line-height ~1.71, `#1C1C28`.
- Caption (`body2`): 12px, weight 500, `#555770`.
- Table header: weight **600**, ~12.6px, on white with a 1px bottom rule.
- Heading (`h6`): 16px, `#555770`.

## Metrics (as built — note the inconsistency)

| Element | Value | vs. model |
|---------|-------|-----------|
| Row height | **52px** (comfortable) | matches `radius`-independent density |
| Input radius | **8px** | model `radius.control` = 8 ✓ |
| Card / menu (Paper) radius | **4px** | model uses 8 — current cards are tighter |
| Action buttons | **pill** (24px radius, 40px height), white fill, orange icon | model `radius.pill` ✓ |
| Chips | 16px radius, 32px height | |
| Drawer width | 260px (icon-rail when collapsed) | see [chrome](../chrome/01-behaviours.md) |
| Spacing base | 8px (MUI default) | model standardises on a **4** base step |

> **Divergences to resolve:** the current app mixes radii (4px cards, 8px
> inputs, pill buttons, 16px chips) and uses an 8px spacing base. The [model](./theming.md)
> proposes a single 4-base spacing step and a small radius scale. The light theme keeps the
> *colours* exact; metrics are expected to standardise.

## Elevation (current shadow recipes)

Four levels, expressed as *offset / blur / shadow colour @ opacity* (the app defines them as
layered shadows; parameters below are platform-neutral):

| Level | Primary layer | Secondary layer |
|-------|---------------|-----------------|
| 1 | y0.5 blur2 `#606170 @ 16%` | blur1 `#28293D @ 8%` |
| 2 | y4 blur8 `#606170 @ 16%` | blur2 `#28293D @ 4%` |
| 3 | y8 blur16 `#606170 @ 16%` | y2 blur4 `#28293D @ 4%` |
| 4 | y12 blur24 `#606170 @ 16%` | y4 blur8 `#28293D @ 30%` |

Model mapping: level 2 ≈ `raised` (menus/popovers), level 3–4 ≈ `overlay` (dialogs); flat
surfaces use a border, not a shadow.
