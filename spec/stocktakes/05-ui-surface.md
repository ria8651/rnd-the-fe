# Stocktakes — UI Surface

> Screens and regions described by **intent and content**, not implementation. No component
> names, no layout prescriptions — a rewrite may realise these however its framework/design
> system dictates, as long as the information and actions are present and gated by the same
> rules (`03-state-rules.md`).
>
> **Shared UI behaviour** (alignment, density, responsive column-hiding, selection, sorting,
> keyboard, inline edit, accessibility) is governed by the cross-cutting
> [UI standards](../ui-standards/) and is not restated here — this doc only calls out
> stocktake-specific applications.

## S1 — List screen

**Purpose:** find, create, and bulk-manage stocktakes.

- **Data:** paginated, sortable table of stocktakes (follows the shared
  [table standards](../ui-standards/tables.md) for density, sorting, and responsive
  column-hiding). Each row conveys at least: stocktake number, status, description, comment,
  created date, finalised date, locked indicator. Status is shown with text + style, never
  [colour alone](../ui-standards/accessibility.md#colour-independence).
- **Filter:** via the shared [add-a-filter menu](../ui-standards/tables.md#filtering) — a
  "Filters" dropdown from which filters are added as typed toolbar controls, persisted in the
  URL. The stocktake list currently offers one filter: **status** (an `enum`: New / Finalised).
  Adding further filters (e.g. created-date range, description text) is a matter of extending
  that filter set, not adding a new UI pattern.
- **Actions:**
  - *New stocktake* → opens the create flow (S2).
  - *Export* the list to CSV.
  - *Select rows* → bulk **delete**.
- **States:** empty (no stocktakes), loading, normal.

## S2 — Create flow

**Purpose:** choose a creation mode and parameters (J2).

- **Mode choice:** Full / Filtered / Blank (mutually exclusive). Switching mode resets the
  other inputs.
- **Full options:** toggle "include items with no stock on hand."
- **Filtered options:** master list, location, VVM status, expiry-before date; toggle
  "include all master-list items."
- **Feedback:** an **estimated line count** for Full/Filtered; a "blank stocktake" notice for
  Blank.
- **Outcome:** on confirm, create and navigate to the new stocktake (S3). Show a saving state.

## S3 — Detail screen

**Purpose:** view and edit one stocktake, count its lines, and finalise.

### Header region
- **Editable** (`NEW`, unlocked): description.
- **Status/lock messaging:** when locked or finalised, show an info banner explaining why
  editing is blocked.
- **Attribution:** counted-by / verified-by, comment, stocktake date (per domain model).
- **Item filter:** free-text search to narrow the line table.

### Actions (screen-level)
- *Add item* (J3) — disabled when not editable.
- *Generate/print report.*
- *Status change* — the shared [split (multi-action) button](../ui-standards/controls.md#split-multi-action-button):
  its primary action is "save and confirm → Finalised" (the only forward transition, so the
  disclosure menu lists New — disabled — and Finalised). Hidden when not editable; a click with
  no counted lines surfaces a notice instead of finalising.
- *Lock / unlock* toggle.
- *Detail/side panel* toggle (summary info).

### Status region (footer)
- **Status crumbs** — the shared [lifecycle indicator](../ui-standards/controls.md#status-crumbs-lifecycle-indicator)
  showing the stocktake flow **New → Finalised**, with the reached status emphasised and its
  history (created / finalised timestamps) revealed on hover/focus/tap.
- The lock toggle and the status-change split button sit alongside the crumbs in this footer
  region.

### Line table
Columns (presence of some is gated by store preferences, noted):

| Column | Notes |
|--------|-------|
| Item code | pinned; row-level error indicator |
| Item name | |
| Batch | |
| Expiry date | |
| Manufacture date | |
| Location | |
| Unit name | |
| Pack size | |
| Doses per unit | only if *manage vaccines in doses* pref; vaccines only |
| **Snapshot packs** | shows mismatch error inline |
| **Counted packs** | editable; shows reduced-below-zero error inline |
| Doses counted | only if *manage vaccines in doses* pref; vaccines only |
| **Difference** | counted − snapshot, in units/doses |
| Reason | required by adjustment direction |
| Donor | only if *track stock by donor* pref |
| Manufacturer | |
| Comment | |

- Numeric columns (snapshot/counted/difference, pack size, doses) follow the shared
  [data-type alignment](../ui-standards/tables.md#data-type-alignment) (right-aligned, tabular
  figures); item code/name are left-aligned with [truncation + tooltip](../ui-standards/tables.md#wrapping-and-truncation).
- Column visibility under narrowing viewports follows the
  [priority tiers](../ui-standards/tables.md#column-priority): item code/name and counted
  packs are P1 (never hidden); batch/location/manufacturer are the first to drop.
- The table is the primary counting surface; it must scale to large line counts
  (virtualised/paginated) and reflect per-line validation errors after a failed finalise.
- Extension point: plugins can contribute extra line columns (preserve as an extensibility
  seam, not a hard requirement).

### Bulk line actions (J5)
- Reduce selected lines to zero (with confirmation).
- Change location of selected lines.
- Delete selected lines.

## S4 — Line editor

**Purpose:** add/count an item's batches (J3).

- **Item selector:** catalogue search; excludes items already on the stocktake; locked to the
  chosen item when editing an existing line.
- **Unit display:** read-only unit name for context.
- **Per-batch entry:** one row per batch (existing + newly added) capturing counted packs,
  batch, expiry/manufacture date, location, pack size, cost/sell price, reason, donor, item
  variant, VVM status, comment/note.
- **Navigation:** move to next/previous item without leaving the editor (supports rapid
  counting).
- **Validation surfacing:** warn on invalid locations for the item; show per-line save errors
  (mismatch, reduced-below-zero, reason required/invalid).

## S5 — Error surfaces

Errors from `02-api-contract.md` map to UI as:
- **Whole-stocktake banner/modal:** `CannotEditStocktake`, `StocktakeIsLocked`.
- **Per-line indicators (keyed to the line):** `SnapshotCountCurrentCountMismatch` (on
  snapshot cell), `StockLineReducedBelowZero` (on counted cell), reason errors.
- **Toast / inline notice:** "no lines to finalise."

## Cross-cutting

- **Responsive / tablet:** a simplified layout exists for tablet counting (fewer columns by
  default, streamlined header). Treat as a target, not an afterthought — counting often
  happens on tablets.
- **Editability is a global gate:** every edit affordance must respect status + lock state
  (`03`). Prefer disabling with explanation over hiding, for finalised/locked stocktakes.
