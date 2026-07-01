# Stocktakes — API Contract

> The durable backbone. Any implementation must speak this contract. Authoritative source:
> the live GraphQL endpoint (introspectable, auth disabled in dev). Operation names below
> match the current GraphQL API; an implementation may name its client operations differently
> but must send the same fields/inputs.

All operations are store-scoped via a `storeId` argument.

## Queries

| Operation | Args | Returns |
|-----------|------|---------|
| `stocktakes` | `storeId`, `filter?`, `page?`, `sort?` | Paginated `StocktakeConnector` (`totalCount`, `nodes`). List view. |
| `stocktake` | `id`, `storeId` | A single `StocktakeNode` (header + lines). |
| `stocktakeByNumber` | `stocktakeNumber`, `storeId` | Same as above, looked up by human number (deep-link/URL). |
| `stocktakeLines` | `stocktakeId`, `storeId`, `filter?`, `page?`, `sort?` | Paginated `StocktakeLineConnector`. Lines fetched independently of the header for large counts. |

**Filtering/sorting** — list filter supports at least `status` (equal/in), plus the usual
date/number fields. Lines filter/sort by item, location, etc. (enumerate exact fields from
the live schema when writing tests).

## Mutations

### `insertStocktake(input: InsertStocktakeInput!, storeId)`

Creates a stocktake and generates its lines per the creation mode. Returns the new
`StocktakeNode` (`id`, `stocktakeNumber`) or an error union.

```
InsertStocktakeInput {
  id: ID!                              # client-generated UUID
  description: String?
  comment: String?
  isInitialStocktake: Bool?            # opening-balance count (one per store)
  createBlankStocktake: Bool?          # no lines
  isAllItemsStocktake: Bool?           # all items incl. zero-stock (full mode)
  includeAllMasterListItems: Bool?     # requires masterListId
  masterListId: ID?                    # filtered mode
  locationId: ID?                      # filtered mode
  vvmStatusId: ID?                     # filtered mode
  expiresBefore: NaiveDate?            # filtered mode (before-or-equal)
}
```

Mode is implied by which fields are set; precedence is fixed (see `03-state-rules.md`).

### `updateStocktake(input: UpdateStocktakeInput!, storeId)`

Updates header fields and/or drives the status transition. Returns `StocktakeNode` on
success or `UpdateStocktakeError`.

```
UpdateStocktakeInput {
  id: ID!
  status: UpdateStocktakeStatusInput?  # only forward to FINALISED
  description: String?
  comment: String?
  isLocked: Bool?
  stocktakeDate: NaiveDate?
  countedBy: String?
  verifiedBy: String?
}
```

Setting `status: FINALISED` triggers validation + inventory adjustments (see `03`).

### `batchStocktake(input, storeId)`

One transactional batch endpoint used for **two** distinct jobs:

1. **Line edits** — `insertStocktakeLines[]`, `updateStocktakeLines[]`, `deleteStocktakeLines[]`.
   Each returns a per-row response so partial errors are reported per line.
2. **Header deletes** — `deleteStocktakes[]` (bulk delete from the list view).

`InsertStocktakeLineInput` / `UpdateStocktakeLineInput` carry the line fields from
`01-domain-model.md` (`countedNumberOfPacks`, `batch`, `expiryDate`, `location`,
`packSize`, `costPricePerPack`, `sellPricePerPack`, `reasonOptionId`, `donorId`,
`itemVariantId`, `vvmStatusId`, `campaignId`, `programId`, `comment`, `note`, …).
Insert additionally takes `itemId` + `stockLineId?`; update is keyed by line `id`.
Nullable update fields use a wrapper (`{ value }`) so "clear to null" is distinguishable
from "leave unchanged".

## Error model

Errors are **typed members of a response union**, not generic strings — the UI matches on
`__typename` and renders per-line where applicable. The implementation must surface each:

| Error | Raised when | Surface |
|-------|-------------|---------|
| `CannotEditStocktake` / `CannotEditFinalised` | Editing a finalised stocktake. | Whole-stocktake banner. |
| `StocktakeIsLocked` | Editing while `isLocked` (and not unlocking). | Whole-stocktake banner. |
| `NoLines` | Finalising with zero lines (or all uncounted). | Block finalise; toast. |
| `StockLineReducedBelowZero` / `StockLinesReducedBelowZero` | A counted value would push stock total/available below zero. | Per-line error, keyed to the offending line. |
| `SnapshotCountCurrentCountMismatch` (+ `…Line`) | A counted line's snapshot ≠ the stock line's current quantity (stock moved since the count was generated). | Per-line error. |
| `AdjustmentReasonNotProvided` | A reason is required for the adjustment direction but none given. | Per-line; block save. |
| `AdjustmentReasonNotValid` | Provided reason's type doesn't match adjustment direction. | Per-line; block save. |

See `03-state-rules.md` for the exact conditions behind each.

## Notes for implementers

- **Lines are paginated and fetched separately** from the header — design for large
  stocktakes (thousands of lines), not eager-loading everything.
- **Optimistic line editing** is feasible because `batchStocktake` returns per-row results;
  an implementation can batch a working set of edits in one call.
- The mismatch error means the spec must tolerate **stock changing underneath an open
  stocktake** — counts are validated against *current* stock at finalise, not at creation.
