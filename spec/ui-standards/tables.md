# UI Standards — Tables

> Framework-agnostic table rules. Link to a section with a `#` anchor, e.g. `[right-aligned](../ui-standards/tables.md#data-type-alignment)`. Source: <https://msupply-foundation.github.io/ui-standards/>.

## Data type alignment

| Data type | Cell align | Notes |
|-----------|-----------|-------|
| Text / names | Left | |
| Numbers / quantities | **Right** | tabular (fixed-width) figures |
| Currency | **Right** | tabular figures, 2 decimals |
| Percentages | **Right** | tabular figures, 1 decimal |
| Dates | Left | DD/MM/YYYY |
| Status badges | Left or center | |
| Booleans / checkboxes | Center | |
| Actions / icons | Right or center | |

A column's **header alignment must match its cells** — right-aligned numeric columns get right-aligned headers; mismatched alignment breaks the visual column.

## Vertical alignment

- Headers: middle-aligned.
- Data cells: **middle-aligned (vertically centered)**. Multi-line content (e.g. a wrapped item name) centres as a block against its single-line neighbours — this reads better for the mostly-single-line rows here and matches the current app.
- Checkbox cells: middle-aligned (visually centered) even when neighbour text wraps.

## Wrapping and truncation

- Short text (codes): never wrap → truncate with ellipsis.
- Item names: wrap to **max 2 lines**, then ellipsis.
- Numbers and dates: never wrap.
- Provide a **tooltip** for any truncated text, coded value needing explanation, and icon-only button.
- Header text may either not-wrap (compact, uniform height) or wrap with a max-height cap (better on small screens).

## Column widths

Recommended fixed widths: codes/IDs 100–150px; dates 100–120px; small numbers 80–100px; large/currency numbers 110–140px; short text 120–160px; long text fills the remaining space. Interactive tables support drag-to-resize (disable per column where it shouldn't resize); simple tables use fixed widths.

## Column priority

Progressive disclosure: assign every column a priority; lower priorities hide first as the viewport narrows.

- **P1 — always visible:** record identifier, selection checkbox, primary status, **and any values core to the table's purpose** (e.g. a stocktake's *counted packs*). P1 is a per-table set, not a fixed count — it is the columns that must never leave the grid.
- **P2 — hide ≤ 800px:** supporting details (e.g. expiry dates, unit labels, line totals).
- **P3 — hide ≤ 1100px:** cross-reference data (e.g. batch codes, locations, unit costs).
- **Never hide:** primary identifiers, status signals, action buttons.

> **On "~5 core columns" at 600–800px** (see [Responsive strategy](#responsive-strategy)): that "core" set is exactly P1 for the table. If P1 is smaller than the visible width allows, P2 columns fill the remaining space until they're hidden at their breakpoint; any columns beyond the visible set remain reachable via horizontal scroll. P1 is never hidden or scrolled away.

## Row density

| Density | Row height | Use |
|---------|-----------|-----|
| Compact | 40px | data-heavy, power users |
| Comfortable | 52px | **default** |
| Spacious | 64px | tablet / touch |

## Responsive strategy

Layered: horizontal scroll (always) + column hiding (see [Column priority](#column-priority))
+ card layout at the smallest sizes.

| Breakpoint | Device | Behaviour | Density |
|-----------|--------|-----------|---------|
| ≥ 1100px | Desktop | all columns | Comfortable (52px) |
| 800–1100px | Tablet landscape | hide P3 | Spacious (64px) |
| 600–800px | Tablet portrait | hide P2+P3; ~5 core columns; horizontal scroll | Spacious (64px) |
| < 600px | Phone | [card layout](#card-layout) (not a table) | Card |

## Card layout

Below 600px, render each row as a card: identifier (name + code) top-left, status badge top-right, selection checkbox in the header; body is a 2-column labelled grid (labels uppercase ~11px, values ~14px); actions right-aligned in a footer with ≥44px targets; **all** columns hidden from the table must still appear as card fields.

## Selection

Row checkboxes plus a header "select all". Selection and hover behaviour follow the shared [interaction states](./interaction.md#where-they-apply): an unselected row shows the `hoverOverlay` on hover, a selected row keeps the `selected` tint, and hovering a selected row deepens to `selectedHover` (token values in the [theme variants](./theming.md)).

## Sorting

Sortable columns have clickable headers; the active sort shows a direction indicator (ascending/descending) in the brand accent.

## Keyboard navigation

Tab/Shift+Tab move between elements; Arrow keys move between rows/columns; Space toggles row selection; Enter activates/edits; Ctrl/Cmd+A selects all; Escape exits edit mode; Home/End jump to first/last cell in a row. See also [accessibility › keyboard navigation](./accessibility.md#keyboard-navigation).

## Inline editing

Inline edit is for **simple, single fields only**: quantity adjustments, dropdown selections, short text. Multi-field or long-text editing belongs in a detail view, not the cell. Validation must combine a visual marker **and** text (error icon + message + border) — never colour alone (see [colour independence](./accessibility.md#colour-independence)).

## Filtering

The standard list-filtering model is an **add-a-filter menu**, not always-visible column filters. It sits in the list toolbar (above the table) and works the same across every list:

- **A "Filters" dropdown** lists the filters *available* for this list but not yet applied. Choosing one **activates** it — its input appears inline in the toolbar, next to the dropdown. Already-active filters drop out of the dropdown so they can't be added twice.
- **Each active filter is its own typed control**, shown side by side. Supported filter types:
  - **text** — free-text contains/match.
  - **enum** — single-select (or multi-select) from a fixed option set.
  - **date / date-time** — a single date or an open/closed **range** (from / to).
  - **number** — a value or a numeric **range**.
  - **boolean** — on/off.
  - A filter definition may also be a **group** that adds several related filters at once.
- **Removing filters:** an active filter clears and disappears when the user clears it; a **"Remove all filters"** entry at the bottom of the dropdown clears every applied filter's value at once. **Default filters** (marked as always-on) stay applied and are not offered for removal individually — remove-all keeps them but resets their values.
- **State lives in the URL.** Every filter binds to a named URL query parameter, so the filtered view is **shareable, bookmarkable, and survives reload / back-forward**. Reading initial filter state from the URL means a link can open a list pre-filtered.
- **Dependent filters** are allowed: one filter's selection may narrow another's options (e.g. picking a category changes the items offered in a second filter). Options refresh when dependencies change; a filter whose definition is withdrawn is dropped from the active set.
- **Applying/changing a filter resets paging to the first page** and re-queries; free-text filters are [debounced](./inputs.md#editing--saving) so typing coalesces into one query. The table's [empty state](#states-empty--loading--error) distinguishes "no records yet" from "no matches for the current filter" and offers the clear-filters affordance.

A **global search** box in the toolbar (quick free-text lookup) may accompany the filter menu; it is separate from the typed filters above. Avoid hidden popover / Excel-style per-column filter icons — filters are explicit toolbar controls.

## Touch targets

Interactive table elements meet the shared minimum **48×48px** (see [accessibility › touch targets](./accessibility.md#touch-targets)): row action buttons, sortable headers, and checkbox hit-areas (small visual checkbox + padding to 48px). Pagination controls ≥ 44×44px.

## Persistent header row

Keep the header row visible as the rows scroll when the table exceeds the viewport height or has ~20+ rows; skip for short (5–10 row) or fully-paginated tables. As with the [action footer](./layout.md#action-footer), this is a visibility requirement, not a specific technique.

## States (empty / loading / error)

A table has four presentation states; the header row is always shown so columns stay legible.

| State | Presentation |
|-------|--------------|
| **Normal** | Rows render. |
| **Loading** | Placeholder/skeleton rows (or a centred indicator for the first load); existing rows may stay visible and dim during a refetch. Announce via a live region. |
| **Empty** | A single centred message spanning the table, distinguishing **no records yet** from **no matches for the current filter** (the latter offers a clear-filters affordance). |
| **Error** | A centred message with the failure and a retry affordance; never a silent blank table. |

⚠️ VERIFY exact copy/affordances against the running app; the four-state model itself is the rule.
