# UI Standards — Controls (buttons, menus, dropdowns)

> Framework-agnostic behaviour for action and selection controls. Source:
> <https://msupply-foundation.github.io/ui-standards/>. Link sections with `#` anchors.
> Most of this doc is **proposed** (the upstream site does not yet cover it) — items are
> marked `⚠️ VERIFY` where they should be confirmed against the upstream UI Standards or the
> running app. The token names/structure are the stable part; exact values defer to the
> [design system](./theming.md).

## Buttons

- **Variants:** `primary` (the one main action of a view, brand fill), `secondary` (outlined /
  neutral surface), `ghost` (text-only, low-emphasis), `destructive` (error colour, for
  delete/irreversible). At most **one primary** action visible per view/region. ⚠️ VERIFY the
  variant set against upstream.
- **Sizing:** label + optional leading icon; height and hit-area meet the shared
  [touch-target minimum](./accessibility.md#touch-targets) (48×48); a compact height exists for
  toolbars/inline use (matching the [compact field height](./inputs.md#field-sizing-and-states)).
- **States:** default / hover / focus (brand [focus ring](./accessibility.md#focus-states)) /
  disabled / busy. A **busy** button shows progress and is non-interactive while the action runs.
- **Disabled vs hidden:** prefer **disabled with an explanation** over hiding an action that is
  unavailable due to state (mirrors the editability gate in
  [stocktakes state-rules](../stocktakes/03-state-rules.md#editability-rules)).
- Icon-only buttons require a [tooltip / accessible label](./tables.md#wrapping-and-truncation).

## Menus & popovers

Any transient surface anchored to a trigger (action menus, selectors, the chrome's store/
language popovers — see [chrome](../chrome/01-behaviours.md)):

- **Open** on trigger activation (click / Enter / Space).
- **Dismiss** on: outside-click, `Escape`, selecting an item, or the trigger toggling it shut.
  On dismissal, **focus returns to the trigger**.
- **Surface:** the `raised` surface + `popover` [elevation](./theming.md#spacing-radius--elevation).
- **Placement:** anchored to the trigger (typically below, start-aligned); stays within the
  viewport (flips/shifts if it would overflow).

## Single-select dropdown

The standard control for choosing one option from a list (location, reason, VVM status, item
variant, store, language, …). It is a combobox + listbox, **not** the native OS `<select>`
popup, so it is themeable and consistent across platforms. ⚠️ VERIFY against upstream.

- **Trigger:** looks like an [input field](./inputs.md#field-sizing-and-states) showing the
  selected option's label (or a placeholder), with a disclosure indicator; obeys the same
  [interaction states](./inputs.md#interaction-states) (incl. invalid).
- **Menu:** app-rendered, **matches the trigger width**, capped height with internal scroll;
  follows [menus & popovers](#menus--popovers) for open/dismiss/placement.
- **Selected vs active:** the **selected** option is marked (check + emphasis); a separate
  **active** (highlighted) option tracks keyboard/pointer focus within the open list.
- **Keyboard:**
  - Closed: `Enter` / `Space` / `Arrow` opens, with the selected option active.
  - Open: `↑`/`↓` move active (skipping disabled), `Home`/`End` jump to first/last, `Enter`/`Space`
    selects the active option and closes, `Escape` closes without changing, `Tab` closes and moves on.
  - Type-ahead (jump to options matching typed characters) is optional. ⚠️ VERIFY.
- **Disabled options** are shown but not selectable and are skipped by keyboard navigation.
- **Searchable variant:** when the list is long (e.g. the store selector), the menu includes a
  text filter; selection/keyboard rules are otherwise identical. See
  [chrome › store selector](../chrome/01-behaviours.md#store-selector).

## Out of scope

Multi-select, free-text autocomplete/combobox with creation, and date pickers each have their
own behaviour; date entry is covered in [inputs › date entry](./inputs.md#interaction-states).
⚠️ Add these here as the verticals that need them are specified.
