# Stocktakes — Acceptance Criteria

> Framework-agnostic Given/When/Then criteria any implementation must pass. Each maps to a
> journey (`04`) and the rules it exercises (`03`). These are the executable definition of
> "the rewrite preserves stocktake behaviour." IDs are stable; cite them in tests.

## Creation

**AC-C1 — Full stocktake generates on-hand lines**
Given a store with stock on hand, when the user creates a *Full* stocktake without
"include all items", then a `NEW` stocktake is created with one line per on-hand stock line,
each with `snapshotNumberOfPacks` = current packs and `countedNumberOfPacks` = null.

**AC-C2 — Full + include all items**
Given items with zero stock, when the user creates a *Full* stocktake with "include all
items", then lines are also generated for the zero-stock items.

**AC-C3 — Filtered stocktake**
Given filters (master list / location / VVM status / expires-before), when the user creates a
*Filtered* stocktake, then only matching on-hand stock lines produce lines (and, if
"include all master-list items" is set with a master list, all that list's items).

**AC-C4 — Blank stocktake**
When the user creates a *Blank* stocktake, then a `NEW` stocktake is created with zero lines.

**AC-C5 — Initial stocktake is once-per-store**
Given a store with no stocktakes, when the user creates an *initial* stocktake, then a line
is generated for every visible stock item; and a second initial-stocktake creation is
rejected.

**AC-C6 — Mode precedence**
Given multiple creation flags set, then the mode resolves as blank → initial → all-items →
all-master-list-items → filtered (first match wins).

## Editing & counting

**AC-E1 — Editable only when NEW and unlocked**
Given a `FINALISED` or locked stocktake, when any header/line edit is attempted, then it is
rejected (`CannotEditStocktake` / `StocktakeIsLocked`) and nothing changes.

**AC-E2 — Unlock-in-same-request is allowed**
Given a locked stocktake, when an update sets `isLocked: false`, then the unlock succeeds.

**AC-E3 — Add batch**
Given a `NEW` stocktake, when the user adds an item/batch with counted packs, then a new line
is persisted; items already on the stocktake are not offered in the add search.

**AC-E4 — Difference is counted − snapshot**
Given a line, then its displayed difference equals `countedNumberOfPacks − snapshotNumberOfPacks`
(0 when uncounted).

**AC-E5 — Reduce-to-zero / bulk location / bulk delete**
Given selected `NEW` lines, when the user reduces to zero / changes location / deletes, then
the operation applies to exactly the selection (reduce-to-zero requires confirmation).

**AC-E6 — In-place edits are edited in place and auto-saved**
Given a `NEW`, unlocked stocktake, when the user changes a header/metadata field (description,
comment, counted-by, verified-by), then it is edited directly in the field (no Save button) and
persisted automatically per the shared [in-place field behaviour](../ui-standards/inputs.md#editing--saving).

**AC-E7 — A pending edit is not lost on navigation**
Given a header/metadata field edited and then navigated away from (or the page refreshed) before
the debounce interval elapses, then the pending change is **flushed and persisted** — not
dropped (see [in-place field behaviour](../ui-standards/inputs.md#editing--saving)).

## Reasons

**AC-R1 — Reason required by direction**
Given active reason options exist for the adjustment direction, when a counted line would
adjust stock in that direction without a reason, then the save is rejected
(`AdjustmentReasonNotProvided`).

**AC-R2 — Reason must match direction**
Given a positive adjustment (counted > snapshot), a `NegativeInventoryAdjustment` reason is
rejected (`AdjustmentReasonNotValid`); and vice-versa (negative adjustments accept
negative / open-vial / closed-vial wastage reasons).

**AC-R3 — No active reasons → none required**
Given no active reasons configured for a direction, when a line adjusts stock that way without
a reason, then it is accepted.

## Finalise — preconditions

**AC-F1 — Cannot finalise with no lines**
Given a stocktake with zero lines, when finalise is attempted, then it is rejected
(`NoLines`) and status stays `NEW`.

**AC-F2 — Cannot reduce below zero**
Given a counted value that would drive a stock line's total or available packs below zero,
when finalise is attempted, then it is rejected (`StockLinesReducedBelowZero`) listing the
offending line(s); nothing is applied.

**AC-F3 — Snapshot must still match current stock**
Given a counted line whose `snapshotNumberOfPacks` no longer equals the stock line's current
total (stock moved since creation), when finalise is attempted, then it is rejected
(`SnapshotCountCurrentCountMismatch`) listing the offending line(s). Uncounted and
new-batch lines are exempt from this check.

**AC-F4 — Finalise is atomic**
Given any precondition failure, then no inventory adjustment, stock change, or status change
is persisted.

## Finalise — effects

**AC-F5 — Positive delta → addition**
Given a counted line on existing stock with counted > snapshot, when finalised, then an
Inventory Addition movement of `|delta|` packs is created against that stock line.

**AC-F6 — Negative delta → reduction**
Given counted < snapshot, when finalised, then an Inventory Reduction movement of `|delta|`
packs is created; and if counted = 0 the stock exits its location.

**AC-F7 — Zero delta → in-place update, no movement**
Given counted = snapshot but other fields changed (location/batch/price/expiry/…), when
finalised, then the stock line is updated in place with no inventory movement.

**AC-F8 — New batch introduced**
Given a counted line with no existing stock line and counted > 0, when finalised, then a new
stock line is created, linked to the stocktake line, with a matching Inventory Addition; a
new-batch line counted to 0 creates no stock.

**AC-F9 — Uncounted lines trimmed**
Given lines with `countedNumberOfPacks` = null, when the stocktake is finalised, then those
lines are removed from the stocktake and cause no stock change.

**AC-F10 — Terminal state**
After finalise, the stocktake is `FINALISED` with `finalisedDatetime` set and is linked to
the addition/reduction adjustment invoice(s); it is read-only thereafter.

**AC-F11 — Adjustment carries reason**
Given a counted line with a reason, when finalised, then the resulting adjustment line records
that reason.

## List & lifecycle

**AC-L1 — Filter by status** — a status filter (New / Finalised) can be added from the
[filter menu](../ui-standards/tables.md#filtering); applying it narrows the list and the
selected value persists in the URL (survives reload and is shareable).
**AC-L2 — Bulk delete** — selected stocktakes are deleted via one batch operation.
**AC-L3 — CSV export** — the list exports to CSV.
**AC-L4 — Deep link by number** — a stocktake can be opened by its human number.

## Detail view vs line editor

**AC-D1 — Detail table is read-only** — on the detail screen, no line-table cell (counted
packs, reason, or any other) is directly editable; the table only displays values and per-line
error indicators.
**AC-D2 — Editing opens the line editor** — selecting a line row opens the line editor for that
item, and *Add item* opens it for a new item; all counted-packs and reason entry occurs there,
not in the table.
**AC-D3 — Lifecycle controls live in a persistent footer** — the status crumbs (New → Finalised),
lock/unlock toggle, and finalise (status-change) button appear together in a footer that
remains visible at the bottom of the detail screen regardless of line count or scroll position.
