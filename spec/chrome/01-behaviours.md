# Chrome — Behaviours

> Framework-agnostic behaviour of each shell region. Grounded in the current host shell.

## Sidebar (desktop primary nav)

- **Collapsible:** toggles between an expanded state (labels visible) and a collapsed icon
  rail. A menu button toggles it; the choice persists once the user has explicitly set it.
- **Responsive default:** auto-collapses on medium-and-smaller screens and auto-expands on
  larger — until the user overrides, after which their choice wins.
- **Sections (top, scrollable):** Dashboard, Replenishment, Inventory, Distribution,
  Dispensary, Cold Chain, Programs, any plugin categories, Reports.
- **Sections (bottom):** Catalogue, Manage, Settings, Sync status, Help.
- **Gating:** some sections appear only for certain store types or user permissions. Nav items
  are link-based and reflect the active route.
- **Hidden** in full-screen mode.

> The exact section→route map and per-section gating is a configuration detail; a rewrite
> should treat the nav as a data-driven list of (icon, label, route, visible?) entries with
> two groups (upper/lower) and optional nested sub-navs, not a hard-coded tree.

## Mobile / tablet nav

- A top bar shows a menu toggle (open/close icon reflects state), breadcrumbs, and the app
  icon.
- The menu opens a slide-down drawer containing the nav links plus **Docs** (external),
  **Sync**, **Settings** (permission-gated), and **Logout**.
- Page-level action buttons and content render below the bar.

## Bottom bar (footer)

A persistent row of controls in a fixed left → right order (mirrored in RTL); each pairs an
[icon](../ui-standards/icons.md) with a label:

1. **Store** — [`home`](../ui-standards/icons.md) + current store name → opens the store selector (below).
2. **Edit store** — [`edit`](../ui-standards/icons.md) + "Edit" → opens store-properties editing.
3. **User** — [`user`](../ui-standards/icons.md) + name → opens user details + logout (below). Only when signed in.
4. **Language** — [`translate`](../ui-standards/icons.md) + current language → opens the language selector (below).
5. **Central-server indicator** — [`central`](../ui-standards/icons.md) + label; shown only when connected to a central server, and **trailing** (right-aligned, at the end of the row).

Thin dividers separate the groups (before the user group when it's shown, and before language).
Condenses on extra-small screens (icon-over-label, evenly spaced) but keeps this order.

## Store selector

- Opens as a click popover from the store control.
- **Visibility:** hidden entirely if the user has fewer than 2 stores (nothing to switch to).
- Lists the user's stores, **sorted by name** and **searchable** by name.
- The current store and any **disabled/on-hold** stores are not selectable (on-hold ones are
  labelled as such).
- **Selecting a store:** sets it as active, closes the popover, and navigates to the root
  landing path (so the user lands in a valid place for the new store, not a stale deep link).
- **"Remember choice":** a per-user preference to skip the store selector at login;
  persisted locally per username.

## Language selector

- Opens as a click popover from the language control.
- Lists available languages; the current one is not selectable.
- **Selecting a language:** changes the active language, persists the choice for the current
  user, and **reloads** so all content re-renders in the new language.
- Honours **RTL** languages (layout direction flips).

## User details & logout

- The user control opens a popover showing username, email, and job title.
- **Logout** requires a **confirmation** prompt; on confirm, the app navigates to the Login
  route (clearing the session). Logout is also available from the mobile nav drawer.

## Cross-cutting

- All chrome regions assume an authenticated session; unauthenticated users are routed to
  login (the chrome consumes auth state, it does not perform login).
- Sync status is surfaced in-shell (a nav entry) so users see connectivity without leaving
  their page.
