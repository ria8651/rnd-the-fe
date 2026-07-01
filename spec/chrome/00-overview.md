# Chrome (App Shell) — Overview

> **Barebones spec.** Chrome is the cross-cutting application frame that wraps every domain vertical — not a domain vertical itself. It is specified lightly: regions + behaviours + acceptance, no domain model or rich API contract. See [`01-behaviours.md`](./01-behaviours.md) and [`02-acceptance.md`](./02-acceptance.md).

## What the chrome is

The persistent frame around the routed page content: navigation, the bottom bar (store / user / language), and the responsive variants of these. It depends on **authentication** (current user, current store, the user's available stores, permissions) and **i18n** (current language, available languages), but owns no business data of its own.

## Regions

| Region | Desktop | Mobile / tablet |
|--------|---------|-----------------|
| **Primary nav** | Collapsible left **sidebar** (icon-rail ↔ expanded) | Top bar with menu toggle + breadcrumbs; slide-down **nav drawer** |
| **Bottom bar** | **Footer**: store selector, edit-store, user/logout, language selector, central-server indicator | Same controls, condensed (extra-small layout stacks icon+label) |
| **Page area** | Routed vertical content (e.g. stocktakes) | Same |

## Out of scope

- The content of any specific page (covered by that vertical's spec).
- Login / authentication flow itself (its own concern); chrome only *consumes* auth state and routes to login on logout.
- Theming/branding specifics (a design-system concern).

## Key dependencies (what an implementation must provide)

- **Auth context:** `user` (name, firstName, lastName, email, jobTitle), `store` (id, name, an optional **custom/brand colour** used for the bottom bar, …), the list of the user's `stores`, `token`, and a permission check.
- **i18n:** current language + name, available language options, RTL flag, change-language, per-user locale persistence.
- **Routing:** navigate, a "root navigation path" (post-store-switch landing), a Login route.
