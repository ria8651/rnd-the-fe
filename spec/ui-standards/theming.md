# UI Standards — Theming Model

> The **platform-neutral** theming contract: the set of semantic roles every theme must define, plus the non-colour scales. It contains **no colour values and no CSS** — so it applies equally to a web app or a native app. Concrete values live in the theme variants:
>
> - [`theme-light.md`](./theme-light.md) — the light theme
> - [`theme-dark.md`](./theme-dark.md) — the dark theme
> - [`theme-mui.md`](./theme-mui.md) — the **existing** app's theme, captured as a reference
>
> Interaction *behaviour* (hover, focus, selected, pressed, disabled…) is **not** here — see [`interaction.md`](./interaction.md). This doc defines the colour *roles* those states use; that doc defines *when* they apply.

## How theming works

1. **Semantic roles, not raw values.** Code references a role (`surface.default`, `text.primary`, `state.error`) — never a literal colour. A theme is a complete mapping from every role below to a concrete value. Swapping themes swaps the mapping; call sites are unchanged.
2. **Every theme defines every role.** Light, dark, and any future theme implement the same role set, so any screen works under any theme.
3. **Colours differ between themes; the scales below do not.** Spacing, radius, elevation, and the type scale are shared by all themes (a theme variant may note where a legacy snapshot diverges).
4. **Brand is constant.** The orange brand accent and blue secondary read as "mSupply" in every theme; only their tints adjust for contrast.
5. **Colour is never the sole signal.** Always pair colour with text/icon/shape ([colour independence](./accessibility.md#colour-independence)).

## Colour roles

The roles every theme must supply a value for. (Values: see the variant docs.)

| Group | Roles |
|-------|-------|
| **Brand** | `brand.primary`, `brand.primaryHover`, `brand.primarySubtle`, `brand.onPrimary`, `brand.secondary`, `brand.secondaryHover`, `brand.secondarySubtle` |
| **Surface** | `surface.base` (app background), `surface.default` (cards/tables/panels), `surface.raised` (modals/menus/popovers), `surface.sunken` (inputs/wells), `surface.nav` (drawer/footer), `surface.scrim` (modal backdrop) |
| **Text** | `text.primary`, `text.secondary`, `text.disabled`, `text.link`, `text.inverse` |
| **Line** | `border.default`, `border.strong`, `divider` |
| **State** | each of `state.error`, `state.warning`, `state.success`, `state.info` provides a `main` (icon/text/border/indicator) and a `subtle` (tinted background) |
| **Interaction** | `hoverOverlay`, `selected`, `selectedHover`, `focusRing` (semantics in [interaction.md](./interaction.md)) |

Domain status palettes (VVM stages, cold-chain hot/cold, vaccination status) map onto `state.*` and must keep their text/icon labels.

## Value notation (for the variant docs)

So values stay platform-neutral (no CSS):

- Opaque colours as 6-digit **hex** (`#1C1C28`).
- Translucent colours as **hex + opacity percentage** (`#E95C30 @ 16%`) — never `rgba(...)`.
- The renderer maps these to its own colour type (web rgba/hsl, native ARGB, etc.).

## Spacing scale

A single base step of **4** (unitless; the platform applies px/dp). Use steps, not arbitrary values: `4, 8, 12, 16, 24, 32, 48`.

## Radius scale

| Role | Step | Applies to |
|------|------|-----------|
| `radius.sm` | 4 | small chips, tight controls |
| `radius.control` | 8 | inputs, buttons, cards, panels |
| `radius.modal` | 12 | dialogs |
| `radius.pill` | full | badges, toggles, segmented/pill buttons |

## Elevation levels

Elevation is expressed as named **levels** by intent — not as shadow CSS. A renderer realises each with whatever its platform uses (web shadow, native shadow/tonal overlay). Parameters are given platform-neutrally as *vertical offset / blur / shadow colour @ opacity*.

| Level | Intent | Offset | Blur | Shadow |
|-------|--------|--------|------|--------|
| `flat` | cards, tables | — | — | none — use `border.default` instead |
| `raised` | menus, popovers, dropdowns | 4 | 8 | neutral @ ~16% |
| `overlay` | dialogs, modals | 12 | 24 | neutral @ ~16–30% |

## Type scale

Roles (sizes shared by all themes; family/exact metrics per variant). See [typography](./typography.md) for formatting.

| Role | Size | Weight |
|------|------|--------|
| `type.heading` | 16 | 600 |
| `type.bodyEmphasis` / table header | 14 | 600 |
| `type.body` / table cell | 14 | 400 |
| `type.caption` / label | 12 | 500 |
| (tablet bumps body to 16 — see [typography](./typography.md#font-sizes)) | | |

## Mode selection

- Default to the **operating system's light/dark preference**.
- Offer a **manual override** (light / dark / follow-system) the user can set.
- **Persist** the choice per user, alongside the language preference (see [chrome](../chrome/01-behaviours.md)).
