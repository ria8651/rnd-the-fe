# Chrome — Acceptance Criteria

> Barebones Given/When/Then for the app shell. Stable IDs (`AC-CH-*`); cite in tests.

## Sidebar

**AC-CH1 — Toggle persists** — Given the sidebar, when the user toggles it, then the
expanded/collapsed state changes and is remembered across navigation.

**AC-CH2 — Responsive default** — Given the user has not manually set the sidebar, when the
viewport drops to medium-or-smaller, then it collapses; and expands again on larger viewports.

**AC-CH3 — Hover peek (non-touch)** — Given a collapsed sidebar on a non-touch device, when
the pointer hovers it, then it temporarily expands; when the pointer leaves, it collapses.
On touch devices, hover has no effect.

**AC-CH4 — Section gating** — Given a store/permission that does not qualify for a nav
section, then that section is not shown.

## Mobile nav

**AC-CH5 — Menu drawer** — Given the mobile layout, when the user taps the menu toggle, then a
nav drawer opens with nav links, Docs, Sync, Settings (if permitted), and Logout; the toggle
icon reflects open/closed state.

## Store selector

**AC-CH6 — Hidden when single store** — Given the user has fewer than two stores, then no
store selector is offered.

**AC-CH7 — Search & sort** — Given multiple stores, when the selector is open, then stores are
listed sorted by name and filterable by a name search.

**AC-CH8 — Unselectable stores** — Given the current store or a disabled/on-hold store, then
it cannot be selected (on-hold stores are labelled).

**AC-CH9 — Switch navigates to root** — When the user selects a different store, then it
becomes the active store and the app navigates to the root landing path.

**AC-CH10 — Remember choice** — When the user enables "remember choice", then the store
selector is skipped at next login for that username.

## Language selector

**AC-CH11 — Current excluded** — Given the language selector, then the current language is not
selectable.

**AC-CH12 — Switch reloads & persists** — When the user selects a language, then the active
language changes, the choice is persisted for the user, and the app reloads so content
re-renders in that language.

**AC-CH13 — RTL** — Given an RTL language is selected, then layout direction flips.

## User & logout

**AC-CH14 — User details** — Given a signed-in user, when the user control is opened, then it
shows username, email, and job title.

**AC-CH15 — Logout is confirmed** — When the user chooses logout, then a confirmation is
required, and on confirm the app navigates to the Login route and the session is cleared.

## Shell

**AC-CH16 — Auth required** — Given no authenticated session, then the user is routed to login
rather than shown the chrome.

**AC-CH17 — Full-screen hides nav** — Given full-screen mode, then the sidebar is hidden.
