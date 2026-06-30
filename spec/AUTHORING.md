# How to Write a Reverse Spec

The spec for writing specs. Follow this when adding a new vertical (e.g. inbound shipments,
requisitions, prescriptions) or extending an existing one. The goal is consistency: any
contributor — human or AI — should produce specs the same shape, at the same altitude, with
the same rigour as `stocktakes/` (the reference implementation — read it alongside this).

---

## 1. What a reverse spec is (and isn't)

A reverse spec captures **what a vertical does**, separated from **how the current frontend
does it**, so the vertical can be rebuilt in *any* framework from the spec alone.

| It IS | It is NOT |
|-------|-----------|
| A behavioural contract: data, operations, rules, journeys, acceptance criteria | A description of the current React components |
| Framework-agnostic | A migration guide or refactor plan |
| Grounded in verified ground truth | A collection of educated guesses |
| Testable (every rule maps to an acceptance criterion) | Prose that can't be checked |

**The test:** could someone rebuild this vertical in Svelte, or Solid, or a native app, using
only the spec — and would the result behave identically? If not, the spec is incomplete or
too implementation-bound.

---

## 2. Sources of truth (triangulate, in priority order)

Never write a rule from a single weak source. Confirm behaviour from the strongest source
available:

1. **Backend service logic** — the strongest source for *rules and effects*. In open-mSupply
   that's the Rust under `server/service/src/<vertical>/` (`validate.rs`, `generate.rs`,
   `mod.rs`). This is where invariants, state transitions, and side-effects truly live.
   *Lesson from stocktakes:* the finalise engine, reduce-below-zero check, and reason rules
   were all only knowable from here — the frontend merely mirrors them.
2. **GraphQL API** — the durable contract for *shape*. `localhost:8000/graphql` (introspect;
   auth is off in dev) and the generated client types (`packages/common/src/types/schema.ts`).
   Anchors operations, inputs, enums, and the error union.
3. **Running app** — `localhost:3003`, or the `open-msupply` MCP tools — to confirm real
   behaviour and resolve ambiguity by observation.
4. **Current client source** — `client/packages/<area>/src/<Vertical>` — evidence of *intent*
   and the UI surface. Treat as evidence, **not** as a design to copy.

**Rule:** if you're inferring rather than confirming, either go read the authoritative source,
or mark it `⚠️ VERIFY` and list it in that doc's open-questions. Do not ship guesses as facts.

---

## 3. The process for a new vertical

Work the layers bottom-up (backbone first); the lower layers are the durable foundation the
upper ones reference.

1. **Scope** — find the vertical's source tree and GraphQL operations. List the screens and
   the operations file. Decide what's in scope vs. referenced-but-owned-elsewhere.
2. **Backbone (01 → 02 → 03)** — domain model, API contract, then state & rules. Resolve
   every rule against backend service code. This is the hard, high-value part.
3. **Surface (04 → 05)** — journeys then UI surface, from the client source + running app,
   described by intent.
4. **Acceptance (06)** — turn every rule in `03` and every journey in `04` into a
   Given/When/Then with a stable ID.
5. **Resolve flags** — eliminate `⚠️ VERIFY` items before declaring the vertical complete, or
   explicitly carry them as known gaps in `00`.
6. **Index** — add the vertical to `README.md` and mark its status.

---

## 4. The layers (required structure, per vertical)

Every vertical is a folder `spec/<vertical>/` with these files. Same numbering, same purpose.

| # | File | Must contain | Must NOT contain |
|---|------|--------------|------------------|
| 00 | `00-overview.md` | Purpose, in/out scope, actors, glossary, a fit-together diagram | Field-level detail |
| 01 | `01-domain-model.md` | Entities, fields (with optionality), enums, relationships, neutral types | GraphQL syntax, component names |
| 02 | `02-api-contract.md` | Operations (name, args, returns), input shapes, the typed error model | UI behaviour, framework code |
| 03 | `03-state-rules.md` | Lifecycle/state machine, editability rules, preconditions, side-effects, invariants summary | UI layout |
| 04 | `04-journeys.md` | Task flows with pre/postconditions, by intent | Widget names, screen layout |
| 05 | `05-ui-surface.md` | Screens/regions by intent, content, actions, states; columns and what gates them | Component names, CSS, hooks, file paths |
| 06 | `06-acceptance.md` | Given/When/Then criteria with stable IDs, mapped to rules/journeys | Vague assertions that can't be tested |

A vertical with unusual needs may add a file (e.g. `07-integrations.md`), but never skip
01–06 or renumber them.

### Cross-cutting shells are the exception

Cross-cutting **app-shell / chrome** specs (navigation, bottom bar, selectors — anything that
*wraps* verticals rather than being one) are intentionally **barebones** and do NOT follow the
7-layer structure. They use a reduced set — `00-overview.md`, `01-behaviours.md`,
`02-acceptance.md` — because they own no domain model or rich API contract; they consume
shared context (auth, i18n, routing). See [`chrome/`](./chrome/) as the reference. Only use
this lighter form for genuine cross-cutting shells, not to shortcut a real domain vertical.

---

## 5. Authoring conventions

**Language**
- Describe **behaviour and intent**, never implementation. Say "the line editor lets the user
  set counted packs", not "`StocktakeLineEditForm` renders a `NumericTextInput`".
- Banned in spec bodies: React/hook names, component names, CSS, file paths, framework APIs.
  (File paths to the *current source* are fine in commit messages and review notes, not in
  the spec body.)
- Prefer present-tense, declarative statements of fact.

**Optionality & types** — use neutral notation: `Field | Type | Notes` tables; mark nullable
with `?`. The GraphQL schema is authoritative for optionality.

**Uncertainty** — flag anything unconfirmed with `⚠️ VERIFY` inline and collect it in an
"Open questions" section. Resolving these is part of "done".

**Stable IDs** — acceptance criteria get stable IDs namespaced per vertical area
(e.g. `AC-F7` = finalise group, item 7). Never renumber existing IDs; append. Tests cite IDs.

**Cross-references** — link between layers with standard GitHub-style markdown anchors
(`[the rule](03-state-rules.md#finalise-effects)`) so a reader can navigate from a UI
affordance to the rule that gates it. Keep each fact in exactly one canonical layer and
reference it elsewhere; don't restate rules in multiple files. In particular, `05-ui-surface.md`
must **link to** the shared [`ui-standards/`](./ui-standards/) for common table/input/
typography/accessibility behaviour rather than re-describing it — only call out
vertical-specific applications.

**Anchors vs. IDs** — for doc-to-doc links, use heading anchors (no separate ID scheme). The
one exception is acceptance criteria, which keep short stable IDs (`AC-*`) because tests cite
them by name in code where a link can't reach.

**Diagrams** — ASCII state machines / flow diagrams are encouraged for lifecycles and
"how it fits together". Keep them small and readable.

**Tone & length** — terse and scannable. Tables over paragraphs where possible. A layer that
needs many pages of prose is probably leaking implementation detail.

---

## 6. Definition of done (review checklist)

A vertical's spec is complete when:

- [ ] All of `00`–`06` exist and follow the structure in §4.
- [ ] Every rule in `03` is traced to an authoritative source (backend service code or
      confirmed behaviour) — no unverified guesses.
- [ ] No `⚠️ VERIFY` flags remain (or remaining ones are listed as known gaps in `00`).
- [ ] Every rule in `03` and journey in `04` has at least one acceptance criterion in `06`.
- [ ] No banned implementation detail (§5) appears in any spec body.
- [ ] The "could it be rebuilt in another framework from this alone?" test passes.
- [ ] Error/edge cases are covered, not just the happy path.
- [ ] `README.md` lists the vertical with accurate status.

---

## 7. Reference implementation

[`stocktakes/`](./stocktakes/) is the worked example. When in doubt about altitude, depth, or
format, match it. Specifically:
- `03-state-rules.md` shows the target rigour for rules and side-effects.
- `06-acceptance.md` shows the target granularity and ID scheme for criteria.
