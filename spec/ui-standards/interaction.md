# UI Standards — Interaction States

> The **behaviour** of interactive elements: which states exist, when each applies, and how
> they combine. This is platform-neutral and contains no CSS. It defines *when* states apply;
> the colours they use are roles defined in the [theming model](./theming.md#colour-roles)
> (values in the theme variants). Source: <https://msupply-foundation.github.io/ui-standards/>
> plus the existing app's behaviour.

## The states

| State | When | What changes |
|-------|------|--------------|
| **Default** | Resting. | Base appearance. |
| **Hover** | Pointer over an interactive element (pointer devices only). | A subtle `hoverOverlay` wash; cursor indicates interactivity. Never the *only* signal an element is interactive — touch has no hover. |
| **Focus-visible** | Element receives **keyboard** focus (not plain pointer clicks). | A clear `focusRing` outline. Must never be removed ([accessibility](./accessibility.md#focus-states)). |
| **Pressed / active** | While being clicked/tapped. | Brief stronger feedback (e.g. deeper tint) confirming the press. |
| **Selected** | The element is chosen/active in a set (table row, list option, active nav item). | A persistent `selected` tint that stays after the pointer leaves. |
| **Disabled** | Action unavailable in the current state. | Reduced emphasis (`text.disabled`); not interactive, not focusable. Prefer disabled-with-explanation over hiding (see [controls](./controls.md#buttons)). |
| **Busy / loading** | An async action is running. | A progress indicator; the control is non-interactive until it resolves. |

## How states combine (precedence)

- **Disabled wins:** a disabled element shows no hover/pressed/focus affordances and can't be
  focused.
- **Selected + hover coexist:** hovering a selected row deepens to `selectedHover`, not the
  plain hover wash.
- **Focus is independent:** focus-visible can appear on top of any other state (e.g. a focused,
  selected row shows both the tint and the ring).

## Where they apply

- **Table rows:** hover wash on unselected rows; `selected`/`selectedHover` for selected rows;
  row checkboxes drive selection. (See [tables › selection](./tables.md#selection).)
- **Sortable headers, buttons, menu items, nav items, links:** hover + focus-visible +
  pressed as above; active nav item uses the `selected` treatment with `brand.primary`.
- **Inputs:** focus moves the border to `focusRing`; invalid state shown per
  [inputs](./inputs.md#field-sizing-and-states) (icon + message, never colour alone).

## Hover is an enhancement, not a requirement

Because the app is used heavily on **touch tablets**, hover may add affordance but must never
*gate* functionality or be the sole indicator of interactivity or meaning. Specifically:

- The navigation drawer does **not** open or expand on hover; it is toggled explicitly (see
  [chrome](../chrome/01-behaviours.md)). Nav items still show a hover state.
- Tooltips (for truncated text and icon-only buttons, see
  [tables › wrapping](./tables.md#wrapping-and-truncation)) must also be reachable by keyboard
  focus, not hover alone.

## Transitions

State changes should be near-instant with a short, consistent transition (no animation that
delays a response). Respect a user's reduced-motion preference: drop non-essential motion.
