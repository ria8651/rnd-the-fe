# UI Standards — URLs & navigation state

> How view state is encoded in the URL so views are **shareable, bookmarkable, and restored on reload / back-forward**. This is a **greenfield** convention — a fresh, consistent scheme, not a capture of the current app's routing.

## Principle

The URL is the **single source of truth for navigable view state**: which store, which screen, which record, and — for lists — the search, filters, sort, and page. Two people who open the same URL (in a session with access) see the same view; reload and browser back/forward reproduce it. State that is not part of *what am I looking at* — an open dropdown, a hover, a row selection, an in-progress unsaved modal — stays **out** of the URL.

## Path vs query

- **Path** = *identity and location*: the store, the area/vertical, and the specific record. Hierarchical and human-readable.
- **Query string** = *modifiers of a list view*: search, filters, sort, pagination. They change what a list shows without changing which screen you are on.

## Path layout

```
/{store}/{area}/{vertical}[/{record}][/{sub-view}]
```

- **Store first.** Every view is scoped to the active store, carried as the **leading path segment** (e.g. `/{storeId}/inventory/stocktakes`). This makes "which store am I in" unambiguous and lets any link carry its store — see [store in the URL](#store-in-the-url).
- **Area / vertical** name the section and the domain (e.g. `inventory/stocktakes`, `distribution/outbound-shipments`), matching the [nav sections](../chrome/01-behaviours.md#sidebar-desktop-primary-nav).
- **Record** identifies one item, preferring its **human-facing number** over an opaque id where one exists (e.g. a stocktake's number), so links are legible and match how users refer to records; fall back to the id when there is no human number.
- Segments are lowercase, hyphenated, and stable; never encode transient state in the path.

## Query parameters (list view state)

One consistent scheme across every list:

| Concern | Param(s) | Notes |
|---------|----------|-------|
| Free-text search | `search` | the toolbar quick lookup / global search |
| Filter | one param **per filter**, named for its field | value encodes operator + value (below) |
| Sort | `sort` | `field` ascending, `field:desc` descending |
| Pagination | `page` (1-based) | plus `pageSize` only when it differs from the default |

- **Filter value encoding.** Equality is bare (`status=NEW`); other operators prefix the value (`expiryDate=before:2026-01-01`, `packs=gte:10`); ranges use a `from:…` / `to:…` (or `min:…` / `max:…`) pair; multi-select repeats the key or comma-joins values. The operator vocabulary is small and shared, and a filter control reads and writes only its own named param (see [tables › filtering](./tables.md#filtering)).
- **Defaults are omitted.** A parameter equal to its default is not written — page 1, the default sort, and empty filters yield a clean URL, so there is one canonical URL per view.
- **Unknown or withdrawn params are ignored**, never errors, so stale links degrade gracefully.

## History & timing

- **Changing list state replaces history; navigating pushes it.** Editing search/filters/sort/page rewrites the current URL **in place** (history *replace*), so Back does not unwind every keystroke or filter tweak. Moving to a different record or screen **pushes** a new entry, so Back returns to the previous view.
- **Changing a filter or the search resets `page`** to the first page (the result set changed) — mirrors [tables › filtering](./tables.md#filtering).
- **Free-text is [debounced](./inputs.md#editing--saving)** before it is written, so typing coalesces into one history-replace and one query.
- **On load the view initializes from the URL** — filters, search, sort, and page are applied with the first query, not after a blank render.

## Store in the URL

- The active store is the leading path segment, so every link is store-scoped and the current store is visible in the address bar.
- **Switching store** swaps that segment and navigates to the area root rather than a stale deep link — the same landing rule as the [store selector](../chrome/01-behaviours.md#store-selector).
- **Opening a link whose store differs from the session's** active store switches the active store to match (when the user has access), so shared links land in the right place; if the user lacks access to that store, they are routed to a safe default with a notice.
