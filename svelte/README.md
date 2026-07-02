# open mSupply — Svelte implementation

A greenfield **Svelte 5 + Vite** SPA built **from the reverse spec** in [`../spec`](../spec) alone
(not ported from the sibling Solid/React/plain-TS/Flutter builds). Covers the **chrome** app-shell
and the **stocktakes** vertical — the only complete vertical in the spec.

## Run

```bash
pnpm install
pnpm dev            # http://localhost:5180 (falls back to next free port)
```

The dev server proxies `/graphql` → `http://localhost:8000/graphql` (the open-mSupply dev
server; auth is off in dev). Data is **live** — no mock layer. Point it at a store with data
(e.g. `SMS Liquica Store` `AFCA0C9F0743AB43B779FB9EA2E64EAF`).

```bash
pnpm check          # svelte-check (type + a11y) — clean
pnpm build          # production build
pnpm icons          # regenerate src/lib/icons/icons.ts from spec/ui-standards/icons
```

## Architecture

- **Framework:** Svelte 5 (runes), client-rendered SPA, small history router (`src/lib/router.svelte.ts`).
- **Routing:** store-scoped URLs `/{store}/{area}/{vertical}[/{record}]` (spec `ui-standards/urls.md`).
  List view-state (status filter, sort, page) lives in the query string.
- **Theming:** semantic CSS custom properties in `src/theme/tokens.css` — light / dark / mui,
  selected by `data-theme` on `<html>`, with follow-system default. One per-theme button radius.
- **Icons:** the spec's 83-icon custom set, snapshotted into a TS module; `Icon.svelte` renders
  them with `currentColor`.
- **State:** module-level rune singletons in `src/lib/state/` (theme, auth, i18n, chrome, viewport,
  toast). In-place autosave (`src/lib/util/autosave.ts`) flushes pending debounced writes on
  blur / teardown / navigation / refresh (divergence D1 / AC-E7).
- **Data:** `src/lib/api/` — a thin GraphQL client plus `stocktakes` / `catalogue` modules, whose
  query shapes were confirmed by introspecting the live schema.

## What's implemented

- **Chrome:** collapsible sidebar (brand-mark toggle with directional spin, reduced-motion aware),
  responsive default, top bar + breadcrumbs, full-screen toggle, mobile nav drawer, slim
  store-coloured bottom bar (store / edit / user / language / theme / central), store selector
  (search, sort, unselectable current/disabled), language selector (reload), theme selector,
  confirmed logout, store-scoped deep links that switch the active store.
- **Stocktakes S1 list:** add-a-filter menu (status, in URL), sortable columns, row selection +
  bulk delete, CSV export, deep-link by number, empty/loading/error states.
- **S2 create:** Full / Filtered / Blank modes with a live line-count estimate.
- **S3 detail:** in-place description (app bar) + attribution/comment (side panel) with autosave;
  read-only line table with priority-based responsive column hiding; status crumbs (New → Finalised)
  with hover/focus history; lock toggle; finalise split button; per-line + banner error surfacing;
  bulk reduce-to-zero (reason-gated), change-location, delete; copy / delete record.
- **S4 line editor:** async catalogue item search (excludes items already present), per-line fields,
  reason-required-by-direction validation, difference readout, prev/next navigation.

## Simplifications

- **Login and i18n are mocked** (the chrome only consumes auth/i18n state per the spec). The store
  list, stocktakes, items, reasons, and line-count estimates are all live.
- **Line editor is a pragmatic subset** (spec's core counting fields): omits donor, manufacturer,
  item variant, VVM status, campaign, and program line attributes.
- Pref-gated columns (doses, donor) and report generation are not surfaced.
- `StoreNode` exposes no brand colour, so the bottom bar falls back to the nav surface (AC-CH17).
