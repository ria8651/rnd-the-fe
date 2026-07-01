# UI Standards — Input Fields

> Source: <https://msupply-foundation.github.io/ui-standards/>. Link sections with `#` anchors.

## Field sizing and states

- **Labels:** static, positioned **above** the field, always visible.
- **Height:** 40px default; 36px in compact contexts (inline table edit, filter rows, toolbars, sidebars).
- **Padding:** one spacing step of horizontal inset; corners use the `radius.control` step (see [theming model › radius](./theming.md#radius-scale)).
- **Surface & border:** `surface.sunken` fill with a `border.default` outline that shifts to `focusRing` on focus (see [focus states](./accessibility.md#focus-states)).
- **Max width:** ~400px for short fields (codes, quantities); ~600px for extended fields (names, descriptions).
- Dropdowns (single-select) follow the same sizing, label, and focus rules but have their own open/keyboard/dismissal behaviour — see [controls › single-select dropdown](./controls.md#single-select-dropdown). Toggles/checkboxes use the accent colour when on.
- **Date entry:** dates are displayed everywhere as DD/MM/YYYY (see [typography › value formatting](./typography.md#value-formatting)). The date *picker* should present and accept DD/MM/YYYY. A native OS date control is an acceptable fallback, but its displayed input format follows the OS locale and so is **not** the target. ⚠️ VERIFY whether a DD/MM/YYYY picker is required or the native control is acceptable.

## Interaction states

Fields use the shared [interaction states](./interaction.md); the rules below are the field-specific specifics (precedence, no layout shift, validation). Colour always pairs with a non-colour cue ([colour independence](./accessibility.md#colour-independence)).

| State | Treatment |
|-------|-----------|
| Default | `border.default` outline, `surface.sunken` fill. |
| Hover | Border darkens to `border.strong`. Applies to the **control surface only** — pointing at the field's *label* must not restyle the control. |
| Focus | Border shifts to the brand accent **plus** the `focusRing`. The ring **replaces** any default focus outline — never show two stacked rings. |
| Disabled | Muted fill + text; not interactive; cursor indicates so. |
| Invalid | Error-colour border **and** an icon + message (see below); the focus ring turns the error colour while focused. |

**State precedence (highest wins):** `disabled` → `invalid` → `focus` → `hover` → `default`. A hovered invalid field stays in its error colour; a focused invalid field shows the error colour on both border and ring.

**Focus changes colour, not geometry.** Receiving focus must not change a field's size, position, or **corner radius** — only its border colour and ring. (Layout shift on focus is a defect.)

**Validation cue.** An invalid field combines a visual marker **and** text — error icon + message + border, never colour alone (mirrors [tables › inline editing](./tables.md#inline-editing)). The message sits below the field; the field references it for screen readers.

## Editing & saving

Two save models. Pick by field complexity; each has a defined behaviour for **leaving the page mid-edit**.

### In-place fields (auto-save)

Simple single fields — a record's metadata/header fields (description, comment, attribution, flags) — are edited **directly where they are displayed** (app bar or side panel), with **no Save button**:

- **Optimistic** — the UI shows the new value immediately.
- **Debounced write** — the write fires once the field has been idle briefly after the last keystroke (current app default ~1000ms), so rapid typing yields one write, not one per key.
- **Rollback on failure** — the field reverts to the last saved value and surfaces the error; on success it re-syncs with the server's canonical copy.
- **Leaving mid-edit flushes the pending write.** Blurring the field, tearing down the view, or navigating away MUST **commit any still-pending debounced write immediately** rather than wait out the timer or drop it — an in-place edit is never silently lost. Because these fields save themselves, this path needs **no "unsaved changes" prompt**. (Differs from the current app — see [`DIVERGENCES.md`](../DIVERGENCES.md).)

### Modal / explicit save

Multi-field or per-row entry (e.g. a stocktake line's batches) is done in a [modal](./layout.md#modals--dialogs) and committed by an **explicit action** — not auto-saved per keystroke. Here the pending work is real and uncommitted, so leaving mid-edit is guarded: **navigating away or refreshing with unsaved changes prompts a confirmation** (proceed and lose changes / stay), and the surface tracks its own dirty state. This is the opposite default from in-place fields — block-and-ask, because there is nothing auto-saving in the background.

### Debounced querying

Free-text inputs that drive a query — global search, text/number [filters](./tables.md#filtering), autocomplete lookups — are debounced before the request fires. The interval is a tuning value, not a contract; the requirement is the behaviour: coalesce rapid input into a single action.

## Widths by content type

| Content | Width | Why |
|---------|-------|-----|
| Numeric quantity (pack qty, stock on hand) | 120px fixed | right-aligned; signals short input |
| Currency / price | 160px fixed | symbol + decimals |
| Date only (expiry, manufacture) | 160px min | DD/MM/YYYY + calendar icon |
| Date + time (delivery, created) | 200px min | room for time |
| Short codes (item, batch, barcode) | 160–200px | predictable length |
| Location / unit / status | 50% of container | pairs with another 50% field |
| Supplier / donor | 50% of container | variable length, pairs well |
| Manufacturer | 100% full width | long formal names |
| Campaign / program | 100% full width | compound names |
| Item name | 100% full width | names with strength/form exceed ~60 chars |

## Grid guidance

For ~640px detail views: 2-column rows split 50/50 (~286px each); 3-column rows split into thirds (~190px each); full-row fields span the width (~592px). Everything collapses to a single column on extra-small screens.
