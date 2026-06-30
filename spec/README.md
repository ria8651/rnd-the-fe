# Reverse Spec

Framework-agnostic behavioural specifications reverse-engineered from the current
open-mSupply frontend. The goal is a spec from which the same vertical can be rebuilt
in **any** frontend stack, without inheriting the current implementation's structure.

## Sources of truth

These specs are triangulated from three sources, in priority order:

1. **GraphQL API** — the durable contract. `localhost:8000/graphql` (live, introspectable)
   and the generated types in the current client. The API is what any rewrite must speak,
   so it anchors the spec.
2. **Running app** — `localhost:3003`. Used to confirm real behaviour, state transitions,
   and rules that source code alone leaves ambiguous.
3. **Current client source** — `open-mSupply-5/client/packages/<domain>`. Tells us intent
   and surfaces business rules, but is treated as evidence, not as a design to copy.

> **Adding or extending a vertical?** Read [`AUTHORING.md`](./AUTHORING.md) first — it is the
> canonical process and quality bar for writing these specs.

## Authoring principles

- **Describe behaviour, not components.** No React, no hook names, no file paths in the
  spec body. Say *"the line editor lets the user set counted packs"*, not *"`StocktakeLineEditForm`
  renders a `NumericTextInput`"*.
- **Lower layers are the backbone.** Domain model, API contract, and state/rules are
  stack-independent and change rarely. UI-surface and journeys describe intent and can be
  realised differently per framework.
- **Invariants are first-class.** Rules currently scattered across hooks, modals, and error
  contexts are hoisted into one place (`03-state-rules.md`). Each is testable.
- **Flag uncertainty.** Anything inferred but not yet confirmed against the live API or app
  is marked `⚠️ VERIFY`.

## Layers (per vertical)

| File | Question it answers |
|------|---------------------|
| `00-overview.md` | What is this vertical for? Glossary, scope, actors. |
| `01-domain-model.md` | What are the entities, fields, and relationships? |
| `02-api-contract.md` | What operations, inputs, and errors exist? |
| `03-state-rules.md` | What states, transitions, and invariants govern it? |
| `04-journeys.md` | What tasks do users perform, with what pre/postconditions? |
| `05-ui-surface.md` | What screens/regions exist, by intent? Columns, actions, states. |
| `06-acceptance.md` | Given/When/Then criteria that any implementation must pass. |

## Verticals

- [`stocktakes/`](./stocktakes/) — stock counting and inventory reconciliation. **(complete — all 7 layers)**

## Cross-cutting

- [`chrome/`](./chrome/) — the app shell (sidebar, mobile nav, bottom bar, store/language
  selectors, logout). **Barebones** (overview / behaviours / acceptance) — wraps all verticals,
  is not one itself.
- [`ui-standards/`](./ui-standards/) — shared UI rules (tables, inputs, typography,
  accessibility) distilled from the published
  [Open mSupply UI Standards](https://msupply-foundation.github.io/ui-standards/). Vertical
  UI-surface docs link to these instead of restating them.
