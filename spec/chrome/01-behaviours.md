# Chrome — Behaviours

> Framework-agnostic behaviour of each shell region. Grounded in the current host shell.

## Sidebar (desktop primary nav)

The sidebar has two states, and the width change between them is **animated** (a smooth
expand/collapse transition, not an instant jump):

- **Expanded** — a full-width labelled panel; every section shows its icon **and** label.
- **Collapsed** — a narrow icon rail; only section icons show, labels hidden.

**The brand mark is the toggle.** The [mSupply figure](../ui-standards/icons.md) (or a store's
custom logo) at the top of the sidebar is the collapse/expand control — activating it toggles
between the two states. It is horizontally centred in a header band at the top of the
sidebar and stays centred in both states, so it remains anchored as the width animates. There
is no separate menu button on desktop; the brand mark *is* the toggle, and it announces its
action to assistive tech ("open the menu" / "close the menu") and reflects the
expanded/collapsed state. The state changes only on this explicit activation
([divergence D3](../DIVERGENCES.md)).

- **Spin on toggle.** Activating the toggle plays a single 360° **spin** of the brand mark as
  feedback; it spins one way when expanding and the other when collapsing, so the motion echoes
  the direction of the change. The spin is decorative: it SHOULD play, but MUST be suppressed
  under a [reduced-motion preference](../ui-standards/accessibility.md#motion).
- **Persistence:** once the user sets the state explicitly it persists across navigation.
- **Responsive default:** until the user overrides it, the state follows the viewport —
  auto-collapsed on medium-and-smaller screens, auto-expanded on larger. After an explicit
  toggle, the user's choice wins.
- **Sections (top, scrollable):** Dashboard, Replenishment, Inventory, Distribution,
  Dispensary, Cold Chain, Programs, any plugin categories, Reports.
- **Sections (bottom):** Catalogue, Manage, Settings, Sync status, Help.
- **Each section pairs a label with an icon** — see the
  [nav-section icon map](../ui-standards/icons.md#primary-navigation-sections-chrome). In the
  collapsed rail only the icon shows; expanded shows icon + label.
- **Gating:** some sections appear only for certain store types or user permissions. Nav items
  are link-based and reflect the active route.
- **Hidden** in full-screen mode.

> The exact section→route map and per-section gating is a configuration detail; an implementation
> should treat the nav as a data-driven list of (icon, label, route, visible?) entries with
> two groups (upper/lower) and optional nested sub-navs, not a hard-coded tree.

## Desktop top bar

Above the routed page content:
- **Section icon + breadcrumbs:** the active [nav section's icon](../ui-standards/icons.md#primary-navigation-sections-chrome)
  followed by the breadcrumb trail for the current route.
- **Full-screen toggle:** enters full-screen (hides the sidebar); the control to exit uses
  [`minimise`](../ui-standards/icons.md).

## Mobile / tablet nav

- A top bar shows a **menu toggle** (open/close glyph reflects state — ⚠️ the current app uses the
  framework's built-in hamburger/close, [not the custom set](../ui-standards/icons.md#primary-navigation-sections-chrome)),
  breadcrumbs, and the app / brand mark ([`m-supply-guy`](../ui-standards/icons.md) or a custom logo).
- The menu opens a slide-down drawer containing the nav links (same section icons as the sidebar)
  plus **Docs** ([`book`](../ui-standards/icons.md), external), **Sync**
  ([`radio`](../ui-standards/icons.md)), **Settings** ([`settings`](../ui-standards/icons.md),
  permission-gated), and **Logout** ([`power`](../ui-standards/icons.md)).
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
