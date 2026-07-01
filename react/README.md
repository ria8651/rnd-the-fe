# open mSupply frontend — React implementation

A React build of the [reverse spec](../spec/) in [`../spec/`](../spec/). Built **only**
from the spec (behaviour, UI standards, chrome) — not from any other implementation.

## Stack

- **Vite** + **React 19** + **TypeScript**
- **react-router** for routing, **@tanstack/react-query** for server state
- **CSS custom properties** for theming — the spec's semantic role model
  ([theming.md](../spec/ui-standards/theming.md)) mapped 1:1 to CSS variables, so
  swapping `[data-theme]` swaps the whole palette (light / dark / existing-MUI).

## Running

The dev [open-mSupply GraphQL server](../spec/stocktakes/02-api-contract.md) must be
running on `:8000` (auth disabled in dev). Vite proxies `/graphql` to it.

```bash
npm install
npm run dev        # http://localhost:5273
npm run typecheck  # tsc --noEmit
npm run build      # production build
```

## What's built

**Stage 1 — foundation + app shell (chrome)**
- Theme tokens (light/dark/MUI roles + spacing/radius/type/elevation scales), system
  default + manual override, persisted.
- The 83-icon custom set as `currentColor` components.
- Core primitives: Button, SplitButton, single-select combobox, inputs, Toggle,
  Modal, Popover/Menu, DataTable, StatusCrumbs, Banner, Toast, FilterBar.
- Page-anatomy layout regions (app bar / scrolling body / persistent action footer /
  side panel).
- Chrome: brand-toggle sidebar (spin + responsive default), top bar (breadcrumbs +
  full-screen + theme), mobile nav drawer, store-coloured bottom bar, store / language /
  user selectors, logout. Auth is seeded from the live `stores` query (login is out of
  the chrome spec's scope).

**Stage 2 — stocktakes list + create**
- List: URL-persisted status filter (add-a-filter menu), sortable columns with
  responsive priority tiers, selection + bulk delete, CSV export, four table states,
  deep-link by number.
- Create: Full / Filtered / Blank modes with a live estimated line count, wired to the
  live `insertStocktake`.

**Stage 3 (next)** — stocktake detail: read-only line table, in-place header editing,
status footer (crumbs + split finalise button + lock), the line editor modal, bulk line
actions, and typed error surfacing. The detail header + status crumbs + deep-link are
already wired.

## Layout

```
src/
  theme/            theme.css (role tokens), ThemeProvider
  styles/           global reset
  icons/            Icon component (loads ../assets/icons/*.svg)
  assets/icons/     the 83 SVG assets (copied from the spec)
  lib/              graphql client, formatting, colour, debounce, id
  components/       shared UI primitives
  app/
    auth/           AuthContext (stores from live GraphQL)
    i18n/           minimal i18n (RTL, persist, reload)
    chrome/         sidebar, top/bottom bars, drawer, selectors, AppShell
    layout/         PageLayout regions
  features/
    stocktakes/     list, create, detail, api, types
  pages/            login stub, placeholder
  routes.tsx
```
