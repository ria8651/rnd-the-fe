# Reverse Spec

Framework-agnostic behavioural specifications for building the open-mSupply frontend fresh. The goal is a spec from which each vertical can be built in **any** frontend stack, without inheriting the current implementation's structure. Behaviour is captured from the existing frontend as evidence; the target is greenfield.

> **Adding or extending a vertical?** Read [`AUTHORING.md`](./AUTHORING.md) first — it is the canonical process and quality bar for these specs: the [sources of truth](./AUTHORING.md#2-sources-of-truth-triangulate-in-priority-order) to triangulate, the [authoring conventions](./AUTHORING.md#5-authoring-conventions), and the [definition of done](./AUTHORING.md#6-definition-of-done-review-checklist).

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

- [`chrome/`](./chrome/) — the app shell (sidebar, mobile nav, bottom bar, store/language selectors, logout). **Barebones** (overview / behaviours / acceptance) — wraps all verticals, is not one itself.
- [`ui-standards/`](./ui-standards/) — shared UI rules: a platform-neutral theming model with separate **light / dark / existing-MUI** colour themes, interaction states, tables, inputs, controls, typography, **icons (actual SVG assets)**, and accessibility — distilled from the published [Open mSupply UI Standards](https://msupply-foundation.github.io/ui-standards/). No CSS, so it suits web or native; vertical UI-surface docs link to these instead of restating them.

## Divergences from the current app

This is a **greenfield** spec — it describes intended behaviour, which sometimes deliberately differs from the current frontend. Those decisions are tracked in one place, [`DIVERGENCES.md`](./DIVERGENCES.md), so the spec bodies state the target plainly and the deltas stay discoverable.
