# Stocktakes — User Journeys

> Task flows described by intent and outcome, independent of UI framework. Each step says *what* the user accomplishes, not *which widget*. Preconditions/postconditions reference the rules in `03-state-rules.md`.

## J1 — Browse and find a stocktake

**Goal:** locate an existing stocktake.
1. User opens the stocktakes list (paginated, sortable).
2. User optionally filters by **status** (New / Finalised).
3. User opens one to view/edit, or selects several for bulk action.

Postcondition: navigates to a detail view, or has a selection for J7.

## J2 — Create a stocktake

**Goal:** start a new count. User picks one mode:

| Mode | User intent | Produces |
|------|-------------|----------|
| **Full** | "Count everything I hold." Optionally include items with zero stock. | Lines for all on-hand stock (+ zero-stock items if chosen). |
| **Filtered** | "Count a subset" — by master list, location, VVM status, and/or expiring-before a date. Optionally include all master-list items incl. zero stock. | Lines matching the filters. |
| **Blank** | "I'll add lines myself." | No lines. |

Before confirming, the user sees an **estimated line count** (or a "blank" confirmation). On confirm, the stocktake is created (`NEW`) and the user lands on its detail view.

Precondition: an *initial* stocktake (opening balances) can be created only if the store has none yet. Postcondition: a `NEW` stocktake exists with generated lines.

## J3 — Add an item/batch to a stocktake

**Goal:** count a batch not already present (or build a blank stocktake).
1. User chooses "add item" and searches the catalogue (items already on the stocktake are excluded from search; in edit mode the item is fixed).
2. The editor shows the item's batches; user can count existing batches and/or add new ones.
3. User enters per-batch details: counted packs, batch, expiry/manufacture date, location, pack size, cost/sell price, reason, donor, item variant, VVM status, comment/note.
4. User saves; lines are upserted in one batch call.

Precondition: stocktake is `NEW` and not locked. Postcondition: lines created/updated; per-line errors surfaced if any (see `03`).

## J4 — Count / edit lines

**Goal:** record physical counts.
1. User scans the line table (filterable by item text).
2. For each line, user sets **counted packs** (and adjusts batch/expiry/location/price/reason as needed). The table shows snapshot, counted, **difference**, and reason inline.
3. A **reason** must be chosen when one is required for the adjustment direction (see `03`).

Precondition: `NEW`, not locked. Postcondition: lines hold counted values; uncounted lines remain null (and will be dropped on finalise).

## J5 — Bulk line operations

- **Reduce selected lines to zero** — set counted = 0 for a selection (e.g. "none of this found"). Confirmation required.
- **Change location of selected lines** — reassign location in bulk.
- **Delete selected lines.**

Precondition: `NEW`, not locked.

## J6 — Lock / unlock

**Goal:** prevent (or re-enable) edits without finalising.
- User locks a `NEW` stocktake → edits are blocked until unlocked.
- User unlocks to resume editing.

Postcondition: `isLocked` toggled; status unchanged.

## J7 — Finalise

**Goal:** commit the count and apply adjustments.
1. User triggers "save and confirm" → Finalised, with a confirmation prompt.
2. System validates: has counted lines, no reduction-below-zero, snapshots still match current stock, reasons valid. On failure, a typed error is shown (whole-stocktake banner or per-line markers) and **nothing is applied**.
3. On success: inventory addition/reduction movements are created, stock is updated, new batches introduced, uncounted lines trimmed, and the stocktake becomes read-only.

Precondition: `NEW`, not locked, at least one counted line. Postcondition: `FINALISED`, `finalisedDatetime` set, linked to adjustment invoices.

## J8 — Delete stocktakes

**Goal:** remove unwanted stocktakes (typically `NEW`).
- From the list, user selects one or more and deletes them (bulk batch delete).

## J9 — Report / export

- **Detail:** generate/print a stocktake report (report selector, respects current sort).
- **List:** export the stocktake list to CSV.

## J10 — Initial (opening-balance) stocktake

**Goal:** establish a store's starting stock.
- A special create mode generating a line for every visible stock item, counted to set opening balances. Allowed once per store. Otherwise behaves like J4 → J7.
