# UI Standards — Controls (buttons, menus, dropdowns)

> Framework-agnostic behaviour for action and selection controls. The published [UI Standards](https://msupply-foundation.github.io/ui-standards/) do **not** cover buttons, menus, split buttons, or autocomplete, so those sections are grounded in the **current app's behaviour** (treated as evidence) with deliberate refinements recorded in [`DIVERGENCES.md`](../DIVERGENCES.md). Link sections with `#` anchors; token names/structure are the stable part, exact values defer to the [design system](./theming.md).

## Buttons

- **Variants:** `primary` (the one main action of a view, filled with the brand accent), `secondary` (outlined / neutral surface), `ghost` (text-only, low-emphasis), and `destructive` (delete / irreversible). At most **one primary** action should be visible per view/region.
- **Destructive styling:** a destructive button carries the error colour as its cue, paired with the delete icon/label so danger never rests on [colour alone](./accessibility.md#colour-independence). (The current app tints only the delete *icon* on an otherwise-neutral button — [divergence D7](../DIVERGENCES.md).)
- **Semantic action buttons:** confirmation/dialog actions come from a small semantic set (confirm/ok, cancel, save, delete, export, copy, next, back, close), each with a consistent icon; primary flow actions advertise a **keyboard shortcut** (e.g. add = Alt+N, save = Alt+S, cancel = Escape) to assistive tech.
- **Sizing:** label + optional leading icon; height and hit-area meet the shared [touch-target minimum](./accessibility.md#touch-targets) (48×48); a compact height exists for toolbars/inline use (matching the [compact field height](./inputs.md#field-sizing-and-states)).
- **States:** default / hover / focus (brand [focus ring](./accessibility.md#focus-states)) / disabled / busy. A **busy** button shows progress and is non-interactive while the action runs.
- **Disabled vs hidden:** prefer **disabled with an explanation** over hiding an action that is unavailable due to state (mirrors the editability gate in [stocktakes state-rules](../stocktakes/03-state-rules.md#editability-rules)).
- Icon-only buttons require a [tooltip / accessible label](./tables.md#wrapping-and-truncation).
- **Radius:** every button in a view shares the theme's single [button radius](./theming.md#radius-scale) — a moderate rounding in the light/dark themes, pill in the existing-MUI theme — never varying button-to-button.

## Split (multi-action) button

The standard control for an action that has **one default target plus alternatives** — most notably advancing a document's status. It is a single rounded control of two fused segments:

- **Primary segment:** a labelled action button that performs the **currently-selected** action directly (e.g. *"Save and confirm → Finalised"*, with a forward [`arrow-right`](./icons.md) icon). This is the one main action of the region.
- **Disclosure segment:** an attached toggle (a `chevron-down`, divided from the primary by a hairline) that opens a [menu](#menus--popovers) of **all** options. Selecting an option makes it the new primary and the button remembers it; it does **not** fire the action immediately.
- **Option gating:** options that aren't valid from the current state are **shown but disabled** (e.g. the current and past statuses), so only legal forward choices are pickable — the menu doubles as a legend of the lifecycle. The selected option marks itself (check + emphasis).
- **Degenerate case:** when only one option is enabled the control still works, behaving like a plain button with an informational menu.
- **Confirmation & guards:** an irreversible primary action opens a [confirmation](#menus--popovers) first; when a precondition fails the click surfaces an explanatory notice instead of acting (e.g. "nothing counted to finalise").
- **Availability:** follows the [disabled-vs-hidden](#buttons) rule — hidden when the whole action is unavailable for the current state (finalised/locked), rather than shown inert.
- **Appearance:** the theme's [button radius](./theming.md#radius-scale) (shared with plain buttons), `raised` [elevation](./theming.md#elevation-levels), secondary emphasis; obeys the shared [interaction states](./inputs.md#interaction-states).

## Status crumbs (lifecycle indicator)

A compact, read-only indicator of **where a document sits in its lifecycle**, shown wherever a record with an ordered status flow is viewed (typically the detail footer). It is **generic across document types** — the same control drives stocktakes (New → Finalised), inbound/outbound shipments, requisitions, etc.; each supplies its own ordered status list and the timestamp for each reached status. The pattern scales identically whether the flow has two steps or several:

- **Crumbs:** the vertical's statuses in order, separated by a forward chevron (which [flips under RTL](./icons.md)). Statuses already **reached** are emphasised (accent text); statuses **not yet reached** are muted. The **current** status is the last reached one. State is conveyed by position + text, never [colour alone](./accessibility.md#colour-independence).
- **History (enhancement):** revealing the crumbs (hover / focus / tap) shows **when** each status was reached — a vertical stepper of status + localised timestamp. This is an [enhancement, not a requirement](./interaction.md) — the crumbs convey current state without it, and it must be reachable by keyboard/touch, not hover-only.
- **Responsive:** on small screens the row collapses to a single *"Status: {current}"* label.
- **Placement:** the crumbs and the [split status button](#split-multi-action-button) that advances the flow live in the document's [action footer](./layout.md#action-footer) (which stays visible as the body scrolls), so they stay reachable in a record of any length.

## Menus & popovers

Any transient surface anchored to a trigger (action menus, selectors, the chrome's store/ language popovers — see [chrome](../chrome/01-behaviours.md)):

- **Open** on trigger activation (click / Enter / Space).
- **Dismiss** on: outside-click, `Escape`, selecting an item, or the trigger toggling it shut. On dismissal, **focus returns to the trigger** (an accessibility improvement over the current app, which drops focus — [divergence D6](../DIVERGENCES.md)).
- **Surface:** the `surface.raised` colour + `raised` [elevation](./theming.md#elevation-levels).
- **Placement:** anchored to the trigger (typically below, start-aligned); stays within the viewport (flips/shifts if it would overflow).

## Single-select dropdown

The standard control for choosing one option from a list (location, reason, VVM status, item variant, store, language, …). It is a **type-to-filter combobox** (combobox + listbox), **not** the native OS `<select>` popup — so it is themeable, consistent across platforms, and searchable by default. A very short, fixed list MAY present as a plain non-filtering list, but the default single-select filters as you type.

- **Trigger:** a [text input](./inputs.md#field-sizing-and-states) showing the selected option's label (or a placeholder) with a trailing disclosure chevron; it obeys the shared [interaction states](./inputs.md#interaction-states) (incl. invalid). Focusing it opens the list, and typing filters the options in place (case-insensitive substring), narrowing as the user types.
- **Menu:** app-rendered, at least the trigger width, capped height with internal scroll; follows [menus & popovers](#menus--popovers) for open/dismiss/placement. When the filter matches nothing, it shows an empty-state message rather than a blank surface.
- **Selected vs active:** the **selected** option is marked (check + emphasis); a separate **active** (highlighted) option tracks keyboard/pointer focus, moving through the **filtered** set.
- **Keyboard:**
  - Closed: `Enter` / `Space` / `Arrow` opens, with the selected option active.
  - Open: `↑`/`↓` move active (skipping disabled), `Home`/`End` jump to first/last, `Enter` selects the active option and closes, `Escape` closes without changing, `Tab` closes and moves on. Typing filters the list — type-to-filter is the default, not a separate mode.
- **Disabled options** are shown but not selectable and are skipped by keyboard navigation.
- **Clearing (the `×` affordance):** whether a value can be cleared follows the field's **optionality**. An **optional** field shows a clear button — a [`close`](./icons.md) (`×`) glyph at the trailing edge, before the chevron — whenever a value is set; activating it empties the field to its placeholder and refocuses it. A **required** field shows **no** clear button: it always holds a value and is changed only by picking another option. The clear button is keyboard-reachable and labelled. (Tying clearability to optionality is a [divergence D5](../DIVERGENCES.md).)

The chrome's [store selector](../chrome/01-behaviours.md#store-selector) is this control applied to a long list.

## Out of scope

Multi-select, free-text autocomplete/combobox with creation, and date pickers each have their own behaviour; date entry is covered in [inputs › date entry](./inputs.md#interaction-states). ⚠️ Add these here as the verticals that need them are specified.
