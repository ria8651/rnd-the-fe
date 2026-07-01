# Chrome — Acceptance Criteria

> Barebones Given/When/Then for the app shell. Stable IDs (`AC-CH-*`); cite in tests.

## Sidebar

**AC-CH1 — Toggle persists** — Given the sidebar, when the user toggles it, then the expanded/collapsed state changes and is remembered across navigation.

**AC-CH1b — Brand mark toggles collapse/expand** — Given the desktop sidebar, when the user activates the brand mark at its top, then the sidebar toggles between expanded (each section shows icon **and** label) and the collapsed icon-only rail (labels hidden); no separate menu button is required, and hovering the sidebar changes nothing.

**AC-CH2 — Responsive default** — Given the user has not manually set the sidebar, when the viewport drops to medium-or-smaller, then it collapses; and expands again on larger viewports.

**AC-CH3 — Section gating** — Given a store/permission that does not qualify for a nav section, then that section is not shown.

## Mobile nav

**AC-CH4 — Menu drawer** — Given the mobile layout, when the user taps the menu toggle, then a nav drawer opens with nav links, Docs, Sync, Settings (if permitted), and Logout; the toggle icon reflects open/closed state.

## Bottom bar

**AC-CH17 — Thin store-coloured strip** — Given the app shell, then the bottom bar is a single compact status-strip row (not a toolbar-height band); its background is the active store's configured colour (or the default nav surface when none is set), and its icons/labels/dividers render in a contrasting, legible foreground. When the active store changes, the colour follows.

## Store selector

**AC-CH5 — Hidden when single store** — Given the user has fewer than two stores, then no store selector is offered.

**AC-CH6 — Search & sort** — Given multiple stores, when the selector is open, then stores are listed sorted by name and filterable by a name search.

**AC-CH7 — Unselectable stores** — Given the current store or a disabled/on-hold store, then it cannot be selected (on-hold stores are labelled).

**AC-CH8 — Switch navigates to root** — When the user selects a different store, then it becomes the active store and the app navigates to the root landing path.

**AC-CH8b — URLs are store-scoped** — Given any view, then its URL carries the active store as a path segment; and opening a URL whose store differs from the session's active store switches to that store (when the user has access) so the link lands on the intended view, per [URL & navigation state](../ui-standards/urls.md#store-in-the-url).

**AC-CH9 — Remember choice** — When the user enables "remember choice", then the store selector is skipped at next login for that username.

## Language selector

**AC-CH10 — Current excluded** — Given the language selector, then the current language is not selectable.

**AC-CH11 — Switch reloads & persists** — When the user selects a language, then the active language changes, the choice is persisted for the user, and the app reloads so content re-renders in that language.

**AC-CH12 — RTL** — Given an RTL language is selected, then layout direction flips.

## User & logout

**AC-CH13 — User details** — Given a signed-in user, when the user control is opened, then it shows username, email, and job title.

**AC-CH14 — Logout is confirmed** — When the user chooses logout, then a confirmation is required, and on confirm the app navigates to the Login route and the session is cleared.

## Shell

**AC-CH15 — Auth required** — Given no authenticated session, then the user is routed to login rather than shown the chrome.

**AC-CH16 — Full-screen hides nav** — Given full-screen mode, then the sidebar is hidden.
