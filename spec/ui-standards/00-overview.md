# UI Standards — Overview

> **Cross-cutting reference.** Shared UI rules that every vertical's `05-ui-surface.md` layer
> draws on, so individual specs don't restate (or contradict) common table/input/typography/
> accessibility behaviour. Vertical specs **link to these** rather than redescribing them.

## Source

Distilled from the published **Open mSupply UI Component Standards**:
<https://msupply-foundation.github.io/ui-standards/>. That site is the canonical, evolving
source; this folder is a framework-agnostic capture of its *rules* for the rewrite. Where the
upstream gives implementation tokens (exact hex, specific component/library config), those
belong to the **design system**, not this spec — here we keep the design intent, numeric
sizes, and behavioural rules a rewrite must honour in any framework.

If this folder and the upstream site disagree, the **upstream site wins** — re-sync this
capture.

## Documents

| File | Covers |
|------|--------|
| [`layout.md`](./layout.md) | **Page anatomy**: the shared screen regions (app bar, content body, always-visible action footer, side panel, modals) and their positioning/scroll behaviour |
| [`theming.md`](./theming.md) | Platform-neutral **theme model**: semantic colour roles, spacing/radius/elevation/type scales, mode selection. No colour values, no CSS. |
| [`theme-light.md`](./theme-light.md) | Light theme colour values |
| [`theme-dark.md`](./theme-dark.md) | Dark theme colour values (proposed baseline) |
| [`theme-mui.md`](./theme-mui.md) | The **existing** app's theme captured as a reference (colours + metrics) |
| [`interaction.md`](./interaction.md) | Interaction states (hover, focus, selected, pressed, disabled, busy) — behaviour, not colour |
| [`tables.md`](./tables.md) | Alignment, density, column priority/responsive, selection, sorting, keyboard, inline edit, filtering, touch targets, empty/loading/error states |
| [`typography.md`](./typography.md) | Font family, sizes, header/cell weight, value formatting (dates/currency/numbers/percent/signed), locale & symbols |
| [`icons.md`](./icons.md) | The icon system + the actual extracted SVG assets in [`icons/`](./icons/) |
| [`inputs.md`](./inputs.md) | Field sizing, states (per interaction model), widths by content type, grid guidance |
| [`controls.md`](./controls.md) | Buttons, menus/popovers, the single-select dropdown (combobox/listbox) behaviour |
| [`accessibility.md`](./accessibility.md) | WCAG 2.1 AA, contrast, focus, keyboard, screen reader, touch targets, colour-independence |

## How to reference

Link to the relevant section with a standard GitHub-style `#` anchor (the heading slug:
lowercase, spaces → hyphens). Don't copy the rule into the vertical spec — link to it:

> The stocktake line table follows the shared [table standards](./tables.md): counted/snapshot
> are numeric and [right-aligned](./tables.md#data-type-alignment), and column visibility
> follows the [priority tiers](./tables.md#column-priority).

If you rename a heading, update the links that point at it (anchors are heading-derived, so a
rename silently breaks them).

## Context the standards assume

These standards target a **health supply-chain** product often used on **tablets in
low-resource settings**, so touch targets, responsive column-hiding, and offline-friendly
density are first-class, not afterthoughts. Treat tablet as a primary target.
