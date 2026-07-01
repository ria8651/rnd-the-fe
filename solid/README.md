# open mSupply — SolidJS implementation

A greenfield **SolidJS** build of the framework-agnostic reverse spec in [`../spec`](../spec).
Implemented directly from the spec (not ported from any other implementation): the spec's
domain model, API contract, state rules, journeys, UI surface, and acceptance criteria are the
source of truth, along with the shared UI standards (theming, layout, tables, inputs, icons).

## Stack

- **SolidJS + Vite + TypeScript**, client-rendered SPA (no SSR). `@solidjs/router` for routing.
- **Live data:** wired directly to the open-mSupply GraphQL API. In dev, Vite proxies
  `/graphql` → `localhost:8000` (auth is off in dev). The GraphQL query strings were confirmed
  by introspecting the live schema.
- **Theming:** a single token source (`src/theme/tokens.ts`, mirroring the spec theme variants)
  is compiled to CSS custom properties (`pnpm tokens`). Three themes — light / dark / existing-app
  (MUI) — selected via a `data-theme` attribute; the OS preference is the default. Pure-CSS
  cascade, no flash.
- **Icons:** the spec's custom SVG set is snapshotted into `src/icons/svg` (`pnpm icons`); every
  glyph inherits `currentColor` so it themes automatically.

## Layout

```
src/
  api/graphql.ts            single GraphQL transport seam
  domain/stocktakes/        the stocktakes vertical
    types.ts                domain model (spec 01)
    rules.ts + rules.test.ts state & rules engine (spec 03), unit-tested citing AC-*
    api.ts                  API adapter (spec 02)
    reference.ts            reference data + line-count estimate
    StocktakeListPage.tsx   S1 list
    StocktakeDetailPage.tsx S3 detail (header, line table, status footer, finalise, lock)
    StocktakeCreateModal.tsx S2 create flow
    StocktakeLineEditor.tsx  S4 line editor
  chrome/                   app shell (sidebar, top bar, bottom bar, selectors, page layout)
  state/                    reactive singletons (theme, auth, i18n, chrome, viewport)
  theme/                    token source + generator output + ThemeToggle
  ui/                       reusable primitives (Table, Modal, Popover, inputs, …)
  pages/                    login, dashboard, placeholder, component gallery
  util/autosave.ts          debounced in-place save with flush-on-leave (divergence D1 / AC-E7)
```

## Scripts

```
pnpm install
pnpm gen        # regenerate theme/tokens.css and copy icons from the spec
pnpm dev        # dev server on http://localhost:5180
pnpm test       # rules-engine unit tests (Vitest)
pnpm typecheck  # tsc --noEmit
pnpm build      # production build
```

## Status

The **stocktakes** vertical and the cross-cutting **chrome** are implemented end to end against
live GraphQL: list (S1), create (S2), detail (S3), line editor (S4), the finalise/lock lifecycle,
bulk line actions, CSV export, and URL-persisted filtering. Other nav sections show a placeholder.

Auth and i18n are mocked stand-ins (the chrome only *consumes* them — the login flow is out of
spec scope); the store list is loaded live so the store selector works against real data.

Known simplifications: the line editor covers the core batch fields (count, batch, expiry,
location, pack size, prices, reason, comment) — donor / manufacturer / item-variant / VVM /
campaign / program line attributes are left as an extensibility seam; VVM/donor/doses table
columns gated by store preferences are not surfaced.
