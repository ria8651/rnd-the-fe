# UI Standards — Icons

> The actual icon **assets**, not just names — extracted from the current app so any
> implementation (web or native) renders the same glyphs. The vector source lives alongside
> this doc in [`icons/`](./icons/) as standalone `.svg` files, with
> [`icons/_manifest.json`](./icons/_manifest.json) listing every icon (`name`, original
> `component`, `viewBox`, `style`). 83 icons captured from the current app's custom set.

## The icon system

- **A single custom SVG set** (not Material/OS icons), so the look is consistent and ownable.
  Two visual styles are present:
  - **Outline / stroke** (Feather/Lucide-style): drawn with `stroke="currentColor"`,
    `fill="none"`, round caps/joins, mostly on a 24×24 grid. 39 icons.
  - **Filled**: solid glyphs using `fill="currentColor"`, various viewBoxes. 44 icons.
- **Colour by inheritance.** Every icon uses `currentColor`, so it takes the surrounding text
  colour — i.e. it themes automatically via the [colour roles](./theming.md#colour-roles)
  (`text.primary`, `brand.primary`, a `state.*` for status icons). Never hard-code an icon
  colour; set the text/icon colour from a token.
- **Colour is never alone.** A status icon always accompanies text/shape, never carries
  meaning by colour alone ([colour independence](./accessibility.md#colour-independence)).
- **RTL.** Directional icons (arrows, navigation chevrons) flip horizontally under
  right-to-left locales; non-directional icons do not. (The current app wraps directional
  icons to flip; preserve that behaviour.)

## Sizing

Icons scale to the font/box they sit in; target sizes:

| Context | Icon size |
|---------|-----------|
| Inline with body text / dense cells | 16 |
| Default (buttons, list items, fields) | 20 |
| Navigation / standalone | 24 |

The **interactive hit area** is independent of glyph size and must meet the shared
[48×48 touch target](./accessibility.md#touch-targets) — pad the target, don't enlarge the glyph.

## Usage in specced surfaces

Semantic mapping for icons used by the [chrome](../chrome/) and [stocktakes](../stocktakes/)
specs (link the meaning, not the file, from vertical docs):

| Meaning | Icon |
|---------|------|
| Dashboard nav | [`dashboard`](./icons/dashboard.svg) |
| Reports nav | [`reports`](./icons/reports.svg) |
| Settings | [`settings`](./icons/settings.svg) |
| Help | [`help`](./icons/help.svg) |
| Docs (external) | [`book`](./icons/book.svg) |
| Logout | [`power`](./icons/power.svg) |
| Active store | [`home`](./icons/home.svg) |
| Language | [`translate`](./icons/translate.svg) |
| User / account | [`user`](./icons/user.svg) |
| Central server | [`central`](./icons/central.svg) |
| Add item / new stocktake | [`plus-circle`](./icons/plus-circle.svg) |
| Save & confirm / next status | [`arrow-right`](./icons/arrow-right.svg) |
| Edit | [`edit`](./icons/edit.svg) |
| Delete | [`delete`](./icons/delete.svg) |
| Copy to clipboard | [`copy`](./icons/copy.svg) |
| Print / generate report | [`printer`](./icons/printer.svg) |
| Reduce packs to zero (rewind) | [`rewind`](./icons/rewind.svg) |
| Clear / deselect | [`minus-circle`](./icons/minus-circle.svg) |
| Filter / search | [`filter`](./icons/filter.svg) · [`search`](./icons/search.svg) |
| Export / import | [`download`](./icons/download.svg) · [`upload`](./icons/upload.svg) |
| Sort | [`sort-asc`](./icons/sort-asc.svg) · [`sort-desc`](./icons/sort-desc.svg) |
| Brand mark (drawer) | [`m-supply-guy`](./icons/m-supply-guy.svg) |

> Not every control carries an icon — e.g. the stocktake **lock / "On hold"** control is a
> text toggle in the current app, not an icon. Reference an icon only where the current frontend
> uses one; don't invent icons for text controls.

## Full set (index)

All assets in [`icons/`](./icons/); grouped here for discovery (see `_manifest.json` for the
authoritative list):

- **Navigation / entities:** dashboard, reports, settings, settings-circle, help, book, home,
  power, user, user-circle, translate, central, sidebar, menu-dots, customers, suppliers,
  invoice, stock, truck, plugin
- **Actions:** plus, plus-circle, minus, minus-circle, edit, delete, copy, save, download,
  upload, file-upload, file, refresh, rewind, search, filter, columns, sliders, sort-asc,
  sort-desc, link, external-link, printer, scan, qr-code-scanner, camera, mail, message-square,
  list, maximise, minimise, expand, collapse, swipe
- **Status / feedback:** alert, circle-alert, info, info-outline, check, check-circle,
  checkbox-checked, checkbox-empty, checkbox-indeterminate, radio, circle, close, x-circle,
  emergency, eye, eye-off, clock
- **Directional:** arrow-left, arrow-right, chevron-down, chevrons-down
- **Cold chain / vaccine:** snowflake, thermometer, sun, zap, location
- **Charts:** bar, bar-chart
- **Brand:** m-supply-guy

## Notes & caveats

- **Decorative illustrations** (e.g. the error-page artwork) are **not** part of the icon set
  and are out of scope here — icons are functional, single-colour, and inherit `currentColor`.
- ⚠️ VERIFY / normalise: the captured icons use inconsistent viewBoxes (24×24, 20×20, 16×16,
  and a few legacy sizes) and mix stroke vs fill styles. They are captured **as-is** from the
  current app; the rewrite should normalise to a single grid and consistent style over time.
  The token names / semantic mapping are the stable part.
- These SVGs are a snapshot; if the upstream set changes, re-extract.
- A few source icons were React components with conditional/variant markup rather than plain
  SVG; these were normalised to their **default** rendering: `alert` uses the single-mark
  variant; `user-circle` / `settings-circle` render the glyph as a white negative space on the
  filled disc; `location` drops an unused mask; `m-supply-guy` keeps its brand gradient. All 83
  files are valid standalone SVG (checked).
