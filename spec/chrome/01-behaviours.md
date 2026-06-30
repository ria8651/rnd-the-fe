# Chrome — Behaviours

> Framework-agnostic behaviour of each shell region. Grounded in the current host shell.

## Sidebar (desktop primary nav)

- **Collapsible:** toggles between an expanded state (labels visible) and a collapsed icon
  rail. A menu button toggles it; the choice persists once the user has explicitly set it.
- **Responsive default:** auto-collapses on medium-and-smaller screens and auto-expands on
  larger — until the user overrides, after which their choice wins.
- **Hover-to-peek:** on non-touch devices, hovering the collapsed rail temporarily expands it;
  leaving collapses it again (with a short debounce). Disabled on touch devices.
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

Persistent row of controls:
- **Store:** home icon + current store name → opens the store selector (below).
- **Edit store:** opens store-properties editing.
- **User:** user icon + name → opens user details + logout (below). Only when signed in.
- **Language:** translate icon + current language → opens the language selector (below).
- **Central-server indicator:** shown when connected to a central server.
- Condenses on extra-small screens (icon-over-label, evenly spaced).

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
