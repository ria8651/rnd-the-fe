# open mSupply — plain-TypeScript implementation

A greenfield build of [`../spec`](../spec) using **plain TypeScript with no UI framework**
(no React/Solid/Vue). Reactivity, DOM construction, and routing are implemented from
scratch to prove the spec is genuinely framework-agnostic.

```bash
npm install
npm run dev        # http://localhost:5480  (proxies /graphql → localhost:8000)
npm run build      # tsc + vite build
npm run typecheck
```

The dev server proxies `/graphql` to the live open-mSupply dev endpoint on
`localhost:8000` (no auth). Login is out of scope (the chrome only consumes auth
state); the active store is chosen from the URL / persisted / first store.

## Architecture

| Area | Files | Notes |
|------|-------|-------|
| Reactivity | `core/signal.ts` | `signal` / `effect` / `computed` with a Solid-style ownership tree; nested effects dispose with their parent. |
| DOM | `core/dom.ts` | `h()` builder; getter children/attrs bind via effects (fine-grained, no VDOM). |
| Routing | `core/router.ts` | History API; store-scoped paths + list-state query params ([`urls.md`](../spec/ui-standards/urls.md)). |
| Theming | `theme/` | Semantic role → CSS-variable mapping for light / dark / MUI themes; OS-preference default + persisted override ([`theming.md`](../spec/ui-standards/theming.md)). |
| Icons | `icons.ts` | The spec's SVG set inlined, inheriting `currentColor`, directional icons flip under RTL. |
| Shared controls | `components/` | Button, input, **combobox** (local + async catalogue lookup), split button, status crumbs, modal, **popover** (top-level, flip/shift, focus-return), table, filter menu, toast. |
| Chrome | `chrome/` | Sidebar (brand-mark toggle + spin), top bar, thin store-coloured bottom bar, store/language/user selectors. |
| Stocktakes | `features/stocktakes/` | List, create flow, detail, line editor, bulk actions, adjustment-reason rules, in-place auto-save. |

## Spec coverage

- **Chrome** ([`chrome/`](../spec/chrome)) — sidebar with data-driven nav + active route, animated collapse via the brand mark (spin suppressed under reduced-motion), responsive default, mobile drawer, full-screen, thin store-coloured bottom bar with contrasting foreground, store/language/user selectors, logout confirmation, store-scoped URLs.
- **Stocktakes** ([`stocktakes/`](../spec/stocktakes)) — S1 list (filter menu, URL-persisted status filter, sort, bulk delete, CSV export), S2 create (Full / Filtered / Blank / Initial with estimate), S3 detail (read-only line table, persistent lifecycle footer, in-place auto-saved metadata, side panel), S4 line editor (async item lookup, per-batch entry, reason gating), S5 error surfaces. Finalise applies inventory adjustments server-side.
- **UI standards** ([`ui-standards/`](../spec/ui-standards)) — page anatomy, table alignment/priority/states, combobox & popover behaviour, in-place vs modal save models (incl. flush-on-leave, [D1](../spec/DIVERGENCES.md)), clearability-follows-optionality ([D5](../spec/DIVERGENCES.md)), focus-return ([D6](../spec/DIVERGENCES.md)), value formatting, WCAG focus/colour-independence.

## Deliberate scope limits

Reference selectors that need extra queries (VVM status in create, vaccine-dose /
donor columns behind store preferences) are noted in code but not wired, and report
generation / store-properties editing surface a "not implemented" notice rather than
faking behaviour. The store brand colour is derived from the store id (the API
exposes none) purely for at-a-glance store identity.
