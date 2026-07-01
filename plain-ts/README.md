# open-mSupply — Stocktakes (plain-TS implementation)

A from-scratch implementation of the **stocktakes** vertical, built directly from the
framework-agnostic reverse spec in [`../spec`](../spec). No UI framework — plain TypeScript,
hand-rolled DOM rendering, a tiny reactive store, and a hash router. Bundled with Vite.

## Why plain TS

The spec is deliberately framework-agnostic (see [`../spec/README.md`](../spec/README.md)).
This build is one of several parallel implementations (Svelte, Flutter, …). It exists to prove
the spec can be realised without a framework and to keep the surface area small and legible.

## Running

```bash
cd plain-ts
npm install
npm run dev
```

Then open http://localhost:5173. The dev server proxies `/graphql` to the live open-mSupply
server at `http://localhost:8000` (auth is off in dev). Pick a store from the store selector in
the footer; stocktakes are store-scoped.

## Layout

| Path | Role |
|------|------|
| `src/api/` | GraphQL client + typed stocktake operations (the [API contract](../spec/stocktakes/02-api-contract.md)) |
| `src/domain/` | Neutral domain types + rules from [03-state-rules](../spec/stocktakes/03-state-rules.md) |
| `src/theme/` | Semantic colour roles + scales ([theming model](../spec/ui-standards/theming.md)) |
| `src/framework/` | Tiny reactive/DOM/router primitives (no external framework) |
| `src/components/` | Shared UI: table, buttons, inputs, dropdown, dialog, toast |
| `src/chrome/` | App shell: app bar, footer, store selector, theme toggle |
| `src/features/stocktakes/` | The vertical: list, create, detail, line editor |

## Status

Staged delivery — see the commit history / the conversation for what each stage covers.
