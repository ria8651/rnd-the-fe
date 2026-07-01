# UI Standards — Page Layout & Anatomy

> The shared **structure** of a screen: which regions exist and where they sit. This is
> information architecture (region roles and positioning intent), **not** visual styling — no
> pixels, grids, or CSS. An implementation may realise the look however its design system dictates, but
> the regions, their order, and their scroll/pin behaviour are the same everywhere so the app
> feels like one product and controls land where users expect.

## The frame

Every routed screen composes from the same regions, in this stacking order:

```
┌──────────────────────────────────────────────────────────┐
│  Nav          │            App bar / toolbar               │  ← chrome + page top
│  (chrome)     ├────────────────────────────────────────────┤
│               │                              │             │
│  sidebar /    │        Content body          │   Detail    │  ← only this region
│  nav rail     │        (scrolls)             │   side      │     scrolls
│               │                              │   panel     │
│               │                              │  (toggled)  │
│               ├────────────────────────────────────────────┤
│  Bottom bar   │        Action footer                       │  ← stays visible; body scrolls
└──────────────────────────────────────────────────────────┘
```

- **Navigation** and the **bottom bar** belong to the app shell — see
  [chrome](../chrome/00-overview.md). Everything below is the routed page's own content area.

## Regions

### App bar / toolbar
The top of the content area. Holds the page title / breadcrumb, a record's header/metadata
fields, page-level actions, and the list [filter menu](./tables.md#filtering) or item search.
It is the home for metadata and entry points, not lifecycle actions.

### Content body
The screen's main matter: a [list/table](./tables.md), a form, or a detail grid. This is the
only region that scrolls; the app bar above and the action footer below stay put while it does.
It must scale to large data sets (virtualised/paginated) without pushing the surrounding regions
off screen.

### Action footer
A region at the bottom of the content area that **stays visible regardless of how far the body
scrolls** — it does not scroll away with the content. It carries the record's primary lifecycle
actions: status indicator ([status crumbs](./controls.md#status-crumbs-lifecycle-indicator)),
the forward-status [action button](./controls.md#split-multi-action-button), lock/hold toggles,
and — when rows are selected — the bulk-action bar for the current selection. Because it stays
visible, these actions remain reachable in a record of any size; that reachability is why
lifecycle controls MUST live here rather than inline with the data or in the app bar. It is
distinct from the shell's [chrome bottom bar](../chrome/01-behaviours.md#bottom-bar-footer),
which persists independently underneath it.

*The "stays visible" requirement is about behaviour, not mechanism* — realise it however the
platform prefers (scroll only the body region, position the footer fixed, a flex column with a
scrolling middle, a native bottom bar, …). The spec mandates the persistence, not the technique.

### Detail side panel
A complementary panel for secondary information and actions (additional info, related records,
per-record actions like delete/duplicate). It is toggleable; on wide viewports it sits beside
the content body, and on narrow ones it becomes an overlay. Its presence never changes where the
primary regions live.

### Modals / dialogs
Layered above the whole frame for a focused sub-task (e.g. editing one record's line, a
confirmation). They own their sub-task's entry completely while open and return focus to their
trigger on close (see [menus & popovers](./controls.md#menus--popovers)).

## Positioning rules

- **One scroll region.** Only the content body scrolls; the app bar and action footer stay
  visible while it does. (How — inner-scrolling body, fixed regions, or otherwise — is an
  implementation choice; nested independent scrollbars are avoided.)
- **Lifecycle actions are footer-anchored** (above); metadata and navigation are app-bar–anchored.
- **Order within a region is meaningful, not incidental.** Elements read in the writing
  direction (left → right in LTR, mirrored in RTL): identity/navigation leads, secondary and
  contextual controls trail. Where a region has a canonical order it is stated where that region
  is specified — the [chrome bottom bar](../chrome/01-behaviours.md#bottom-bar-footer) and each
  vertical's action footer/toolbar give their own left-to-right order — so controls stay where
  users expect them.
- **Responsive.** On small/tablet widths regions may stack or condense and the side panel
  becomes an overlay, but their **roles and order are preserved** — the footer stays visible at
  the bottom, the toolbar stays on top. Tablet is a [primary target](./00-overview.md#context-the-standards-assume).
