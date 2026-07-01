# Stocktakes — State & Rules

> The invariants the rewrite must preserve, hoisted out of the current hooks/modals into
> one place. Authoritative source: backend service logic (validated against the running
> app where noted). These rules are **enforced server-side**; the UI mirrors them for
> good UX but must not assume it is the only guard.

## Status lifecycle

```
        ┌─────────────────────────── finalise ──────────────────────────┐
        │                                                                ▼
   ┌─────────┐   create                                            ┌───────────┐
   │ (none)  │ ─────────►  NEW  ──────────────────────────────────►│ FINALISED │
   └─────────┘            (editable)                               │ (terminal)│
                                                                   └───────────┘
```

- **NEW** — the only editable state. Lines and header can be modified.
- **FINALISED** — terminal. No edits. Reached only by `updateStocktake(status: FINALISED)`.
- There is **no un-finalise** and no intermediate status.
- `isLocked` is an **orthogonal** soft lock: while locked, edits are rejected
  (`StocktakeIsLocked`) unless the same request unlocks it. Locking does not change status.

## Editability rules

A stocktake is editable if and only if `status = NEW` and `isLocked = false`. Any other state
disables all header edits, all line edits (add/count/edit/delete), and delete-stocktake. This
one condition gates every edit affordance in the UI; the server enforces it per field.

| Condition | Effect |
|-----------|--------|
| `NEW` and not locked | Editable: header fields, lines, lock toggle, finalise, and delete available. |
| `FINALISED` | Terminal. All edits rejected (`CannotEditFinalised` / `CannotEditStocktake`); delete not offered. |
| Locked (still `NEW`) | Edits rejected (`StocktakeIsLocked`) unless the same request sets `isLocked: false` — so the unlock toggle stays available. Delete not offered while locked. |
| Store mismatch | Rejected (`InvalidStore`). |

Locked and finalised block edits for different reasons: locked is user-reversible (unlock to
resume), finalised is permanent. Both SHOULD show an explanatory banner rather than silently
disable (see [05 › metadata fields](./05-ui-surface.md#metadata-fields)).

## Finalise preconditions (validated before any adjustment)

When `updateStocktake` sets `status: FINALISED`, **all** must hold or the whole finalise
is rejected with a typed error:

1. **Has lines** — at least one line exists, else `NoLines`. (The UI also blocks finalise
   when every line is uncounted.)
2. **No reduction below zero** — for any counted line with an existing stock line, the
   resulting adjustment must not drive `totalNumberOfPacks` or `availableNumberOfPacks`
   below zero, else `StockLinesReducedBelowZero` (lists every offending line).
3. **Snapshot still matches current stock** — for any *counted* line with an existing stock
   line, `snapshotNumberOfPacks` must still equal the stock line's current
   `totalNumberOfPacks`. If stock moved since the count was generated, finalise is rejected
   with `SnapshotCountCurrentCountMismatch` (lists offending lines). Uncounted lines and
   new-batch lines are skipped by this check.

## What finalise does (the adjustment engine)

For **each line**, let `delta = countedNumberOfPacks − snapshotNumberOfPacks`. Uncounted
lines (`countedNumberOfPacks = null`) generate no movement and are **trimmed (deleted)**
from the stocktake on finalise.

| Line situation | Outcome |
|----------------|---------|
| Has stock line, `delta = 0` | No inventory movement. Stock line is updated in place (location, batch, pack size, prices, expiry, manufacture date, donor, manufacturer, item variant, VVM, campaign, program). VVM-status-change log written if changed. |
| Has stock line, `delta > 0` | **Inventory Addition** stock-in line for `|delta|` packs against the existing stock line. |
| Has stock line, `delta < 0` | **Inventory Reduction** stock-out line for `|delta|` packs. If counted = 0, a location *exit* movement is also generated. |
| No stock line (new batch), counted > 0 | A **new stock line** is created and linked back to the stocktake line, plus an **Inventory Addition** stock-in line for the counted packs. Location *enter* movement if a location is set. |
| No stock line, counted = 0 | Nothing created (no zero-quantity stock line). |

Aggregate effects on finalise:

- An **Inventory Addition** invoice is created iff there are addition lines; an **Inventory
  Reduction** invoice iff there are reduction lines. Both use the store's inventory-adjustment
  name, status `NEW`, `verifiedDatetime = now`, and inherit the stocktake's `programId`.
- The stocktake is stamped `status = FINALISED`, `finalisedDatetime = now`, and linked to
  the addition/reduction invoice ids.
- Each adjustment line records its line's `reasonOptionId` as the inventory-adjustment reason.

## Adjustment-reason rules (enforced at line save)

Reasons gate line edits, by **adjustment direction**. Sign convention (from the code, and
genuinely confusing — pin it in tests):

> `reductionAmount = snapshot − counted`. A **positive** reductionAmount means stock went
> **down** (a *negative* adjustment). A **negative** reductionAmount means stock went **up**
> (a *positive* adjustment).

- **Reason required** (`AdjustmentReasonNotProvided`): if active reason options exist for
  the relevant direction (`PositiveInventoryAdjustment` when stock went up,
  `NegativeInventoryAdjustment` when stock went down) and the line provides none.
- **Reason valid** (`AdjustmentReasonNotValid`): the chosen reason's type must match the
  direction — a positive adjustment needs a `PositiveInventoryAdjustment` reason; a negative
  adjustment needs `NegativeInventoryAdjustment`, `OpenVialWastage`, or `ClosedVialWastage`.
- If no active reasons are configured for a direction, no reason is required for it.

## Creation / line-generation rules

`insertStocktake` generates lines by mode, resolved in this fixed precedence (first match):

1. **Blank** (`createBlankStocktake`) — no lines.
2. **Initial** (`isInitialStocktake`) — one line for **every visible stock-type item**
   (no stock-line link; for opening balances). Only one initial stocktake per store.
3. **All items** (`isAllItemsStocktake`) — all items including those with zero stock on hand.
4. **All master-list items** (`includeAllMasterListItems`, requires `masterListId`) — every
   item on the master list incl. zero-stock.
5. **Filtered / default** — one line per stock line *with packs in store*, narrowed by any of
   `masterListId`, `locationId`, `vvmStatusId`, `expiresBefore`.

In all stock-derived modes, each generated line snapshots the stock line's current packs
into `snapshotNumberOfPacks` and leaves `countedNumberOfPacks` null until counted.

## Invariants summary (testable assertions)

- A finalised stocktake is immutable.
- Finalise is atomic: if any precondition fails, no adjustment is written.
- Counted − snapshot drives exactly one of {no-op update, addition, reduction} per line.
- Uncounted lines never affect stock and do not survive finalise.
- Counts are validated against *current* stock at finalise time, not creation time.
- New batches with zero count never create stock.
- Reason requirement depends on whether active reasons exist for the adjustment direction.
