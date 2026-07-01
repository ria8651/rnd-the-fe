# Stocktakes — UI Surface

> Screens and regions described by **intent and content**, not implementation. No component names and no visual styling (pixels/CSS) — an implementation may realise the look however its framework/design system dictates, as long as the information and actions are present, sit in the standard [page regions](../ui-standards/layout.md), and are gated by the same rules (`03-state-rules.md`). *Where* a region sits (its anatomy) is in scope; how it is styled is not.
>
> **Shared UI behaviour** (alignment, density, responsive column-hiding, selection, sorting, keyboard, inline edit, accessibility) is governed by the cross-cutting [UI standards](../ui-standards/) and is not restated here — this doc only calls out stocktake-specific applications.

## S1 — List screen

**Purpose:** find, create, and bulk-manage stocktakes.

- **Data:** paginated, sortable table of stocktakes (follows the shared [table standards](../ui-standards/tables.md) for density, sorting, and responsive column-hiding). Each row conveys at least: stocktake number, status, description, comment, created date, finalised date, locked indicator. Status is shown with text + style, never [colour alone](../ui-standards/accessibility.md#colour-independence).
- **Filter:** via the shared [add-a-filter menu](../ui-standards/tables.md#filtering) — a "Filters" dropdown from which filters are added as typed toolbar controls, persisted in the URL. The stocktake list currently offers one filter: **status** (an `enum`: New / Finalised). Adding further filters (e.g. created-date range, description text) is a matter of extending that filter set, not adding a new UI pattern.
- **Actions** (icons per the [icon set](../ui-standards/icons.md)):
  - *New stocktake* ([`plus-circle`](../ui-standards/icons.md)) → opens the create flow (S2).
  - *Export* ([`download`](../ui-standards/icons.md)) the list to CSV.
  - *Select rows* → bulk **delete** ([`delete`](../ui-standards/icons.md)).
- **States:** empty (no stocktakes), loading, normal.

## S2 — Create flow

**Purpose:** choose a creation mode and parameters (J2).

- **Mode choice:** Full / Filtered / Blank (mutually exclusive). Switching mode resets the other inputs.
- **Full options:** toggle "include items with no stock on hand."
- **Filtered options:** master list, location, VVM status, expiry-before date; toggle "include all master-list items."
- **Feedback:** an **estimated line count** for Full/Filtered; a "blank stocktake" notice for Blank.
- **Outcome:** on confirm, create and navigate to the new stocktake (S3). Show a saving state.

## S3 — Detail screen

**Purpose:** view one stocktake, review its lines, manage the line set, and finalise.

Line data (counted packs, reason, batch, dates, location, prices, …) MUST be entered only in the line editor (S4); the detail screen's line table is read-only and opens S4 when a row is selected. This keeps per-batch entry coherent and preserves a single validation path.

**Layout** — the screen uses the standard [page anatomy](../ui-standards/layout.md); its regions map as:

```
App bar / toolbar   →  header fields (description, …) + item search
Content body        →  the line table (scrolls)
Action footer       →  lock · status crumbs · finalise button   (or bulk-action bar)
Side panel          →  additional info (counted/verified-by, comment) + delete/copy
```

### Metadata fields
The stocktake's metadata is split across the app bar (description) and the side panel (attribution + comment) per the layout map above. These are **edited in place** — directly in the field, auto-saved (optimistic + debounced) with no Save button, per the shared [in-place field behaviour](../ui-standards/inputs.md#editing--saving). (Line data, by contrast, is entered in the S4 modal — see the [purpose](#s3--detail-screen) invariant.) Every editable field shares the one [editability gate](./03-state-rules.md#editability-rules) — writable only while `NEW` and unlocked, otherwise read-only (SHOULD disable-with-reason rather than hide).

**Editable fields** (gated):

| Field | Control | Notes |
|-------|---------|-------|
| Description | short text | Free-text title/label. |
| Counted by | short text | Attribution. |
| Verified by | short text | Attribution. |
| Comment | multi-line text | Free-text note (may be auto-generated for full/filtered creates). |

**Read-only / system fields** (always display-only): stocktake number, status, entered-by (owning user, with contact detail on demand), created date, and — once set — finalised date.

- **`stocktakeDate`** is accepted by the update API (see [02](./02-api-contract.md)) but is **not surfaced as an editable control in the current app**; treat exposing it as optional.
- **Status / lock messaging:** when locked or finalised, show an info banner explaining why editing is blocked — distinguishing the reversible **locked** state ("unlock to edit") from the permanent **finalised** state.
- **Item filter:** a free-text search that narrows the line table. This is a **view filter, not a stored field**, and stays available regardless of status/lock.
- **Record actions (side panel):** *delete stocktake* ([`delete`](../ui-standards/icons.md); only when `NEW` and unlocked — same gate) and *copy record to clipboard* ([`copy`](../ui-standards/icons.md); always available).

### Actions (screen-level)
Icons per the [icon set](../ui-standards/icons.md).
- *Add item* ([`plus-circle`](../ui-standards/icons.md)) (J3) — disabled when not editable.
- *Generate / print report* ([`printer`](../ui-standards/icons.md)).
- *Status change* — the shared [split (multi-action) button](../ui-standards/controls.md#split-multi-action-button) ([`arrow-right`](../ui-standards/icons.md)), in the [status footer](#status-footer): its primary action is "save and confirm → Finalised" (the only forward transition, so the disclosure menu lists New — disabled — and Finalised). Hidden when not editable; a click with no counted lines surfaces a notice instead of finalising.
- *Lock / on-hold* toggle — in the [status footer](#status-footer); a **text toggle** ("On hold"), not an icon.
- *Detail / side panel* toggle (summary info).

### Status footer
The stocktake's lifecycle controls occupy the screen's [action footer](../ui-standards/layout.md#action-footer): laid out left → right,

- **Lock / unlock** toggle.
- **Status crumbs** — the shared [lifecycle indicator](../ui-standards/controls.md#status-crumbs-lifecycle-indicator) showing the stocktake flow **New → Finalised**, reached status emphasised, history (created / finalised timestamps) revealed on hover/focus/tap.
- **Status-change split button** (the finalise control), right-aligned.

Because the footer stays visible, these MUST remain reachable however long the line list grows. When rows are selected, the [bulk line-action bar](#bulk-line-actions-j5) takes over this same region until the selection clears.

### Line table
A read-only table of the stocktake's lines (see the S3 [purpose](#s3--detail-screen) invariant). Selecting a row opens the line editor (S4) for that item; *Add item* opens it for a new item.

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
| **Counted packs** | shows reduced-below-zero error inline |
| Doses counted | only if *manage vaccines in doses* pref; vaccines only |
| **Difference** | counted − snapshot, in units/doses |
| Reason | required by adjustment direction |
| Donor | only if *track stock by donor* pref |
| Manufacturer | |
| Comment | |

- Numeric columns (snapshot/counted/difference, pack size, doses) follow the shared [data-type alignment](../ui-standards/tables.md#data-type-alignment) (right-aligned, tabular figures); item code/name are left-aligned with [truncation + tooltip](../ui-standards/tables.md#wrapping-and-truncation).
- Column visibility under narrowing viewports follows the [priority tiers](../ui-standards/tables.md#column-priority): item code/name and counted packs are P1 (never hidden); batch/location/manufacturer are the first to drop.
- The table is the primary review surface; it must scale to large line counts (virtualised/paginated) and reflect per-line validation errors after a failed finalise, keyed to the offending row.
- Extension point: plugins can contribute extra line columns (preserve as an extensibility seam, not a hard requirement).

### Bulk line actions (J5)
Shown in the [action footer](../ui-standards/layout.md#action-footer) when lines are selected, with a *clear selection* ([`minus-circle`](../ui-standards/icons.md)) affordance:
- Reduce selected lines to zero ([`rewind`](../ui-standards/icons.md)) — opens a confirmation dialog stating how many lines are affected. Setting counted = 0 is a reduction, so the dialog carries a [reason selector](../ui-standards/controls.md#single-select-dropdown) whenever active reasons exist for a reduction (per the [adjustment-reason rules](./03-state-rules.md#adjustment-reason-rules-enforced-at-line-save)); confirm stays disabled until a reason is chosen, and the chosen reason is applied to **every** selected line. When no reduction reasons are configured, no reason field shows and confirm proceeds. A vaccine-only selection offers vaccine-wastage reasons.
- Change location of selected lines ([`arrow-right`](../ui-standards/icons.md)).
- Delete selected lines ([`delete`](../ui-standards/icons.md)).

## S4 — Line editor

**Purpose:** the single surface for entering line data — add/count an item's batches and set their reason, batch, dates, location, prices, etc. (J3). A [modal](../ui-standards/layout.md#regions) over S3, opened by selecting a line (edit) or via *Add item* (create).

- **Item selector:** catalogue search; excludes items already on the stocktake; locked to the chosen item when editing an existing line.
- **Unit display:** read-only unit name for context.
- **Per-batch entry:** one row per batch (existing + newly added) capturing counted packs, batch, expiry/manufacture date, location, pack size, cost/sell price, reason, donor, item variant, VVM status, comment/note.
- **Navigation:** move to next/previous item without leaving the editor (supports rapid counting).
- **Validation surfacing:** warn on invalid locations for the item; show per-line save errors (mismatch, reduced-below-zero, reason required/invalid).

## S5 — Error surfaces

Errors from `02-api-contract.md` map to UI as:
- **Whole-stocktake banner/modal:** `CannotEditStocktake`, `StocktakeIsLocked`.
- **Per-line indicators (keyed to the line):** `SnapshotCountCurrentCountMismatch` (on snapshot cell), `StockLineReducedBelowZero` (on counted cell), reason errors.
- **Toast / inline notice:** "no lines to finalise."

## Cross-cutting

- **Responsive / tablet:** a simplified layout exists for tablet counting (fewer columns by default, streamlined header). Treat as a target, not an afterthought — counting often happens on tablets.
- **Editability is a global gate:** every edit affordance must respect status + lock state (`03`). Prefer disabling with explanation over hiding, for finalised/locked stocktakes.
