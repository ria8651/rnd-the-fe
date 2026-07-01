# Divergences from the current frontend

This spec is **greenfield**: it describes the behaviour the new frontend should have, which is
not always what the current open-mSupply frontend does. Where a decision was made to
**intentionally differ** from the current implementation, it is recorded here — one running list
— so the spec bodies can state the target plainly (without "the current app does X, but…" asides)
while the rationale and the delta stay discoverable in one place.

This is **not** a bug list or a backlog for the current app. It is the set of deliberate "the
spec does it differently" decisions. Add a row when you make such a decision; link it from the
spec section that states the new behaviour.

| # | Area | Current app | This spec | Why | Ref |
|---|------|-------------|-----------|-----|-----|
| D1 | In-place field save on navigation | The debounced write is a timer that isn't deliberately flushed on leave, so a quick edit-then-navigate/refresh can be dropped (or persist only if the timer happens to survive). | Leaving a field mid-edit (blur / view teardown / navigation / refresh) **flushes** the pending write immediately — a pending edit is never lost. | Silent data loss on a field the user believes is saved is unacceptable; auto-save must actually save. | [inputs › editing & saving](./ui-standards/inputs.md#editing--saving), [AC-E7](./stocktakes/06-acceptance.md) |
| D2 | Colour themes | Light theme only. | Light **and** dark themes, selectable (OS preference + manual override). | Dark mode is expected on modern devices and helps low-light clinical/warehouse settings; building the token model now avoids a costly retrofit. | [theme-dark](./ui-standards/theme-dark.md), [theming](./ui-standards/theming.md) |
| D3 | Navigation drawer hover | The sidebar drawer opens/expands on hover ("hover-to-peek"). | The drawer does **not** react to hover; it opens only via an explicit toggle. | Hover-to-peek triggers accidentally and doesn't translate to touch (a primary target); explicit toggle is predictable. | [interaction](./ui-standards/interaction.md) |
| D4 | Mobile menu toggle icon | Uses the UI framework's built-in hamburger / close glyphs, outside the custom icon set. | Uses the custom icon set (`menu-dots` / `sidebar` / `close`) — no second icon library. | One owned, consistent icon set; avoid a stray dependency for two glyphs. | [icons › nav sections](./ui-standards/icons.md#primary-navigation-sections-chrome) |

## How to add an entry

1. Give it the next `D<n>` id (ids are stable; never renumber).
2. State the current behaviour and the spec's behaviour in one line each, plus the *why*.
3. Link the spec section that states the new behaviour (and any AC that tests it).
4. Keep the spec body itself free of "differs from current app" prose — just link here.
