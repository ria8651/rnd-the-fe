# Stocktakes — Domain Model

> Framework-agnostic. Types are described in neutral notation; the authoritative source is the live GraphQL schema. Field optionality below reflects the API contract (`?` = nullable/optional).

## Entities

A **Stocktake** is a point-in-time count of stock in a store, used to reconcile the system's recorded stock against physically counted stock. Confirming (finalising) a stocktake applies the differences as inventory adjustments.

```
Stocktake 1 ──── * StocktakeLine ──── 0..1 StockLine (existing stock being counted)
                                  └─── 1   Item
                                  └─── 0..1 Location
```

A stocktake holds header/metadata; each line represents one batch of one item being counted (or a new batch being introduced via a blank stocktake).

---

## Stocktake (header)

| Field | Type | Notes |
|-------|------|-------|
| `id` | ID | |
| `stocktakeNumber` | Int | Human-facing sequential number, store-scoped. |
| `status` | `StocktakeStatus` | `NEW` or `FINALISED`. See `03-state-rules.md`. |
| `description` | String? | Free-text title/label. |
| `comment` | String? | Free-text note; auto-generated for filtered/full creates. |
| `createdDatetime` | DateTime | |
| `finalisedDatetime` | DateTime? | Set when status becomes `FINALISED`. |
| `isLocked` | Boolean | Soft edit-lock, independent of status. |
| `isInitialStocktake` | Boolean | The store's opening-balance count. Only one allowed per store. Generates a line for **every** visible stock item (no stock-line link), for establishing opening stock. |
| `countedBy` | String? | Free-text attribution. |
| `verifiedBy` | String? | Free-text attribution. |
| `stocktakeDate` | Date? | Effective date of the count (settable on update). |
| `user` | User? | The creating/owning user (`username`, `email`). |
| `lines` | StocktakeLine[] | With `totalCount`. |

### StocktakeStatus (enum)

```
NEW        — editable working state; lines can be added/counted/removed
FINALISED  — terminal; differences applied as inventory adjustments; read-only
```

Only these two values exist. There is no draft/in-progress distinction beyond `NEW`, and no un-finalise transition.

---

## StocktakeLine

One counted batch. `snapshotNumberOfPacks` captures the system's recorded quantity at the moment the line was generated; `countedNumberOfPacks` is what the user physically counted. Their difference (× pack size) is the adjustment applied on finalise.

| Field | Type | Notes |
|-------|------|-------|
| `id` | ID | |
| `stocktakeId` | ID | Parent. |
| `item` | Item | `code`, `name`, `unitName`, `isVaccine`, `doses`, `defaultPackSize`, `restrictedLocationTypeId`. |
| `itemId` / `itemName` | ID / String | Denormalised. |
| `stockLine` | StockLine? | The existing stock being counted; null for newly-introduced batches. |
| `snapshotNumberOfPacks` | Float | Recorded packs at line creation. Drives mismatch detection. |
| `countedNumberOfPacks` | Float? | User-entered count. Null = not yet counted. |
| `packSize` | Float | |
| `batch` | String? | |
| `expiryDate` | Date? | |
| `manufactureDate` | Date? | |
| `sellPricePerPack` | Float? | |
| `costPricePerPack` | Float? | |
| `volumePerPack` | Float? | |
| `comment` | String? | Stocktake-line note, shown in the line editor. |
| `note` | String? | Distinct from `comment`: carried through onto the stock line / inventory-adjustment line created on finalise. |
| `location` | Location? | `id`, `name`, `code`, `onHold`, `locationType`. Item may restrict allowed location type. |
| `reasonOption` | ReasonOption? | Adjustment reason; required when count ≠ snapshot (see rules). |
| `donor` | Name? | `donorId` / `donorName`. |
| `manufacturer` | Name? | |
| `itemVariant` | ItemVariant? | With `packagingVariants` (`packSize`, `volumePerUnit`). |
| `vvmStatus` | VVMStatus? | Vaccine vial monitor status. |
| `campaign` | Campaign? | `id`, `name`. |
| `program` | Program? | `id`, `name`. |

---

## Related entities (referenced, owned elsewhere)

- **Item** — the catalogue item. Stocktake lines reference but never mutate it. Relevant props: `isVaccine`/`doses` (vaccine handling), `defaultPackSize`, `restrictedLocationTypeId` (constrains valid locations), store-level default sell price.
- **StockLine** — existing on-hand stock. A stocktake line counts one stock line. Reducing a count below what is available/issued triggers `StockLineReducedBelowZero`.
- **Location** — physical storage; may be `onHold` and typed (`locationType`).
- **ReasonOption** — inventory-adjustment reason (`reason`, `type`, `isActive`).
- **MasterList**, **VVMStatus**, **Campaign**, **Program**, **Name** (donor/manufacturer), **ItemVariant** — used as filters at creation and as line attributes.

---

## Creation inputs (shape of "new stocktake")

A stocktake is created in one of three modes (one `insert` operation, mode selected by which fields are set — see `02-api-contract.md`):

| Mode | Generates lines for | Key inputs |
|------|--------------------|------------|
| **Full** | All stock currently on hand. Optionally also all items with zero stock (`isAllItemsStocktake`). | `isAllItemsStocktake?` |
| **Filtered** | Stock matching filters. Optionally all items on a master list incl. zero stock (`includeAllMasterListItems`). | `masterListId?`, `locationId?`, `vvmStatusId?`, `expiresBefore?`, `includeAllMasterListItems?` |
| **Blank** | No lines; user adds them manually. | `createBlankStocktake: true` |

All modes accept `description?` and `comment?`. `isInitialStocktake?` marks a store's first count.

---

## Creation-mode precedence

When multiple creation inputs are set, the backend resolves them in this fixed order (first match wins): **blank → initial → all-items → all-master-list-items → filtered**. The filtered path additionally constrains to stock with packs in store. See `03-state-rules.md` for the full generation rules and `02-api-contract.md` for inputs.
