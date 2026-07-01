# Stocktakes — Overview

## Purpose

A **stocktake** lets a store reconcile what the system *believes* is in stock against what is *physically* counted. The user generates a set of lines (each a batch of an item with its recorded "snapshot" quantity), records the counted quantity for each, and **finalises** — at which point the differences are applied to stock as inventory adjustments (additions/reductions), and new batches discovered during counting are introduced as stock.

It is one of the core inventory-control workflows: the system of record for "did our books match reality, and what did we change to make them match."

## Scope of this spec

In scope:
- Listing, creating, viewing, editing, and finalising stocktakes.
- Counting lines (existing batches and newly-introduced batches).
- The status/lock lifecycle and all finalise-time invariants.
- Inventory-adjustment effects of finalising.

Adjacent, referenced but specified elsewhere:
- Stock lines, locations, items, master lists, reasons, VVM statuses, campaigns, programs, donors — stocktakes *consume* these but do not own them.
- Inventory adjustment invoices produced by finalise (their own vertical).

## Actors

- **Store user** — creates and counts stocktakes, finalises them. The only actor in the core flow. Attribution fields (`countedBy`, `verifiedBy`) are free text, not enforced roles.

## Glossary

| Term | Meaning |
|------|---------|
| **Stocktake** | A counting operation over a store's stock at a point in time. |
| **Line** | One batch of one item being counted within a stocktake. |
| **Snapshot packs** | The recorded quantity at the moment the line was generated. |
| **Counted packs** | The physically-counted quantity entered by the user. |
| **Difference / delta** | `counted − snapshot`; drives the inventory adjustment. |
| **Finalise** | Terminal transition that applies all differences to stock. |
| **Lock** | A soft, reversible edit-block independent of status. |
| **Inventory adjustment** | The addition/reduction stock movement produced on finalise. |
| **Reason** | A configured reason option categorising an adjustment (required by direction). |
| **Initial stocktake** | A store's one-time opening-balance count over all items. |

## How the vertical fits together

```
  List view ──select/create──► Detail view ──count lines──► Finalise ──► Inventory adjustments
     │                              │                          │
   filter by status           edit header,                validate invariants,
   bulk delete                add/count lines,             apply stock changes,
   export CSV                 lock/unlock                  lock to read-only
```

Read the layers in order: `01` (what the data is) → `02` (how you talk to it) → `03` (the rules) → `04` (what users do) → `05` (what they see) → `06` (how to prove it works).
