# UI Standards — Controls (buttons, menus, dropdowns)

> Framework-agnostic behaviour for action and selection controls. Source: <https://msupply-foundation.github.io/ui-standards/>. Link sections with `#` anchors. Most of this doc is **proposed** (the upstream site does not yet cover it) — items are marked `⚠️ VERIFY` where they should be confirmed against the upstream UI Standards or the running app. The token names/structure are the stable part; exact values defer to the [design system](./theming.md).

## Buttons

- **Variants:** `primary` (the one main action of a view, brand fill), `secondary` (outlined / neutral surface), `ghost` (text-only, low-emphasis), `destructive` (error colour, for delete/irreversible). At most **one primary** action visible per view/region. ⚠️ VERIFY the variant set against upstream.
- **Sizing:** label + optional leading icon; height and hit-area meet the shared [touch-target minimum](./accessibility.md#touch-targets) (48×48); a compact height exists for toolbars/inline use (matching the [compact field height](./inputs.md#field-sizing-and-states)).
- **States:** default / hover / focus (brand [focus ring](./accessibility.md#focus-states)) / disabled / busy. A **busy** button shows progress and is non-interactive while the action runs.
- **Disabled vs hidden:** prefer **disabled with an explanation** over hiding an action that is unavailable due to state (mirrors the editability gate in [stocktakes state-rules](../stocktakes/03-state-rules.md#editability-rules)).
- Icon-only buttons require a [tooltip / accessible label](./tables.md#wrapping-and-truncation).

## Split (multi-action) button

The standard control for an action that has **one default target plus alternatives** — most notably advancing a document's status. It is a single pill made of two fused segments:

- **Primary segment:** a labelled action button that performs the **currently-selected** action directly (e.g. *"Save and confirm → Finalised"*, with a forward [`arrow-right`](./icons.md) icon). This is the one main action of the region.
- **Disclosure segment:** an attached toggle (a `chevron-down`, divided from the primary by a hairline) that opens a [menu](#menus--popovers) of **all** options. Selecting an option makes it the new primary and the button remembers it; it does **not** fire the action immediately.
- **Option gating:** options that aren't valid from the current state are **shown but disabled** (e.g. the current and past statuses), so only legal forward choices are pickable — the menu doubles as a legend of the lifecycle. The selected option marks itself (check + emphasis).
- **Degenerate case:** when only one option is enabled the control still works, behaving like a plain button with an informational menu.
- **Confirmation & guards:** an irreversible primary action opens a [confirmation](#menus--popovers) first; when a precondition fails the click surfaces an explanatory notice instead of acting (e.g. "nothing counted to finalise").
- **Availability:** follows the [disabled-vs-hidden](#buttons) rule — hidden when the whole action is unavailable for the current state (finalised/locked), rather than shown inert.
- **Appearance:** pill radius, `raised` [elevation](./theming.md#elevation-levels), secondary emphasis; obeys the shared [interaction states](./inputs.md#interaction-states).

## Status crumbs (lifecycle indicator)

A compact, read-only indicator of **where a document sits in its lifecycle**, shown wherever a record with an ordered status flow is viewed (typically the detail footer). It is **generic across document types** — the same control drives stocktakes (New → Finalised), inbound/outbound shipments, requisitions, etc.; each supplies its own ordered status list and the timestamp for each reached status. The pattern scales identically whether the flow has two steps or several:

- **Crumbs:** the vertical's statuses in order, separated by a forward chevron (which [flips under RTL](./icons.md)). Statuses already **reached** are emphasised (accent text); statuses **not yet reached** are muted. The **current** status is the last reached one. State is conveyed by position + text, never [colour alone](./accessibility.md#colour-independence).
- **History (enhancement):** revealing the crumbs (hover / focus / tap) shows **when** each status was reached — a vertical stepper of status + localised timestamp. This is an [enhancement, not a requirement](./interaction.md) — the crumbs convey current state without it, and it must be reachable by keyboard/touch, not hover-only.
- **Responsive:** on small screens the row collapses to a single *"Status: {current}"* label.
- **Placement:** the crumbs and the [split status button](#split-multi-action-button) that advances the flow live in the document's [action footer](./layout.md#action-footer) (which stays visible as the body scrolls), so they stay reachable in a record of any length.

## Menus & popovers

Any transient surface anchored to a trigger (action menus, selectors, the chrome's store/ language popovers — see [chrome](../chrome/01-behaviours.md)):

- **Open** on trigger activation (click / Enter / Space).
- **Dismiss** on: outside-click, `Escape`, selecting an item, or the trigger toggling it shut. On dismissal, **focus returns to the trigger**.
- **Surface:** the `surface.raised` colour + `raised` [elevation](./theming.md#elevation-levels).
- **Placement:** anchored to the trigger (typically below, start-aligned); stays within the viewport (flips/shifts if it would overflow).

## Single-select dropdown

The standard control for choosing one option from a list (location, reason, VVM status, item variant, store, language, …). It is a combobox + listbox, **not** the native OS `<select>` popup, so it is themeable and consistent across platforms. ⚠️ VERIFY against upstream.

- **Trigger:** looks like an [input field](./inputs.md#field-sizing-and-states) showing the selected option's label (or a placeholder), with a disclosure indicator; obeys the same [interaction states](./inputs.md#interaction-states) (incl. invalid).
- **Menu:** app-rendered, **matches the trigger width**, capped height with internal scroll; follows [menus & popovers](#menus--popovers) for open/dismiss/placement.
- **Selected vs active:** the **selected** option is marked (check + emphasis); a separate **active** (highlighted) option tracks keyboard/pointer focus within the open list.
- **Keyboard:**
  - Closed: `Enter` / `Space` / `Arrow` opens, with the selected option active.
  - Open: `↑`/`↓` move active (skipping disabled), `Home`/`End` jump to first/last, `Enter`/`Space` selects the active option and closes, `Escape` closes without changing, `Tab` closes and moves on.
  - Type-ahead (jump to options matching typed characters) is optional. ⚠️ VERIFY.
- **Disabled options** are shown but not selectable and are skipped by keyboard navigation.
- **Clearing (the `×` affordance):** whether a value can be cleared follows the field's optionality. A dropdown bound to an **optional** value shows a clear button — a [`close`](./icons.md) (`×`) glyph at the field's trailing edge, before the disclosure arrow — whenever a value is set; activating it empties the field back to its placeholder and returns focus to it. A dropdown bound to a **required** value shows **no** clear button: it always holds a value and is changed only by picking another option. The clear button is keyboard-reachable and carries an accessible label.
- **Searchable (type-to-filter) variant:** for long lists (locations, items, the store selector), the trigger *is* a text input paired with the disclosure arrow — not a static label. Focusing it opens the list; typing filters the options in place (case-insensitive substring match), narrowing the list as the user types, and keyboard navigation moves through the **filtered** set. When nothing matches, the menu shows an empty-state message rather than a blank surface. Selection, dismissal, and clearing behave exactly as above. See [chrome › store selector](../chrome/01-behaviours.md#store-selector).

## Out of scope

Multi-select, free-text autocomplete/combobox with creation, and date pickers each have their own behaviour; date entry is covered in [inputs › date entry](./inputs.md#interaction-states). ⚠️ Add these here as the verticals that need them are specified.
