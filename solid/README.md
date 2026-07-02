# open mSupply — SolidJS implementation

A greenfield **SolidJS** build of the framework-agnostic reverse spec in [`../spec`](../spec),
implemented directly from the spec (not ported from any other implementation). The spec's
domain model, API contract, state rules, journeys, UI surface, and acceptance criteria are the
source of truth, along with the shared UI standards (theming, layout, tables, inputs, controls,
icons, URLs, accessibility).

## Stack

- **SolidJS + Vite + TypeScript**, client-rendered SPA. `@solidjs/router` for store-scoped routing.
- **Live data:** wired to the open-mSupply GraphQL API. In dev, Vite proxies `/graphql` →
  `localhost:8000` (auth is off in dev). All query/mutation shapes were confirmed by introspecting
  the live schema (typed error unions, nullable-update wrappers, enum casing).
- **Theming:** semantic role tokens as CSS custom properties (`src/theme/tokens.css`), three
  themes — light / dark / existing-app (MUI) — via a `[data-theme]` attribute; the OS preference
  is the default and is applied before first paint (no flash). One per-theme choice: the button
  radius (control vs. pill).
- **Icons:** the spec's custom SVG set is snapshotted into `src/icons/svg` (`pnpm icons` to
  re-sync); every glyph inherits `currentColor` so it themes automatically and flips under RTL
  when directional.

## Layout

```
src/
  lib/            transport (graphql), format, debounce, autosave (flush-on-leave), uuid, csv
  state/          reactive singletons: theme, viewport, chrome, store, auth, i18n, toast
  theme/          token → CSS custom properties (light / dark / mui)
  ui/             primitives: Button, SplitButton, Modal, Popover (portal + flip/shift),
                  Select + AsyncSelect (combobox / catalogue lookup), inputs, Checkbox, Table
                  (responsive column priority, selection, sort, 4 states, card layout),
                  StatusBadge, StatusCrumbs, FilterBar, Toast, ConfirmDialog, Icon
  chrome/         app shell: AppShell, Sidebar (collapse + spin), TopBar, MobileNav drawer,
                  BottomBar, StoreSelector, LanguageSelector, UserMenu (+ logout)
  domain/stocktakes/
                  types.ts       domain model (spec 01)
                  rules.ts       state & rules engine — editability, delta, adjustment
                                 direction, reason gating, finalise guard (spec 03, AC-* cited)
                  api.ts         API adapter (spec 02) — typed errors keyed per line
                  reference.ts   reasons / items / locations / master lists / VVM + estimate
                  StocktakeListPage.tsx    S1 list
                  StocktakeCreateModal.tsx S2 create flow
                  StocktakeDetailPage.tsx  S3 detail (header, line table, status footer, bulk)
                  StocktakeLineEditor.tsx  S4 line editor
  pages/          Login (mock), Placeholder (other nav sections)
```

## Scripts

```
pnpm install
pnpm dev        # dev server on http://localhost:5180 (falls back to 5181 if busy)
pnpm typecheck  # tsc --noEmit
pnpm build      # production build
pnpm icons      # re-copy the icon set from ../spec/ui-standards/icons
```

## Status

The **stocktakes** vertical and the cross-cutting **chrome** are implemented end to end against
live GraphQL:

- **S1 list:** paginated/sortable table, status filter added from the filter menu and persisted
  in the URL, CSV export, bulk delete, deep-link to detail by human number.
- **S2 create:** Full / Filtered / Blank modes with an estimated line count, initial-stocktake flag.
- **S3 detail:** in-place auto-saved header/metadata (flush-on-leave), a read-only line table
  (data is entered only in the editor), a persistent status footer with the lock toggle, New→
  Finalised status crumbs, and the finalise split button; bulk reduce-to-zero (with the required
  reason), change-location, and delete; finalise with typed errors keyed to the offending lines.
- **S4 line editor:** async catalogue-lookup item selector, per-batch fields, reason gated by
  adjustment direction, per-line save errors, next/previous navigation.

**Chrome** is implemented to spec: store-scoped routing, sidebar (explicit toggle + spin, no
hover-to-peek), top bar breadcrumbs + full-screen, mobile/tablet drawer nav (custom glyphs),
the slim store-coloured bottom bar with store / edit / user / language / central controls, and
the store / language / user popovers with logout confirmation.

Auth and i18n are stand-ins (the chrome only *consumes* them). Other nav sections render a
placeholder. Verification bar for this pass: typecheck + production build + a dev-server smoke
against live data.

### Known gaps

- Store on-hold labelling in the selector: `StoreNode.name` requires a `storeId` argument, so
  per-store on-hold isn't fetched here; `isDisabled` gates selectability.
- The create-flow line count is an estimate (item counts as a proxy; location/VVM/expiry filters
  narrow further server-side) — shown as "≈ N".
- Report generation and store-properties editing are stubbed (out of scope for this vertical).
