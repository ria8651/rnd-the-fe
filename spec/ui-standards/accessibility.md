# UI Standards — Accessibility

> Target: **WCAG 2.1 AA**. Source: <https://msupply-foundation.github.io/ui-standards/>.
> Link sections with `#` anchors. Exact brand hex values live in the design system.

## Compliance and contrast

- Normal text (14–16px): **4.5:1** minimum contrast.
- Large text (18px+): **3:1** minimum.
- UI components / graphical objects: **3:1** minimum.
- The brand palette is pre-validated (charcoal ~13.8:1, accent orange ~4.9:1, blue ~6.2:1 on
  white) — stay within validated combinations.

## Focus states

Every focus-visible interactive element shows a clear focus indicator: a 2px outline in the
`focusRing` token (brand orange — see [theming roles](./theming.md#colour-roles)) with a 2px
offset, applied on keyboard focus per [interaction states](./interaction.md#the-states).
**Never remove focus outlines** — it breaks keyboard accessibility.

## Keyboard navigation

Everything operable by mouse must be operable by keyboard. Table keys: Tab/Shift+Tab between
elements; Arrows between rows/columns; Space toggles selection; Enter activates/edits;
Ctrl/Cmd+A selects all; Escape exits edit mode; Home/End to first/last cell. (Mirrors
[tables › keyboard navigation](./tables.md#keyboard-navigation).)

## Screen readers

Use semantic structure (real table/`thead`/`tbody`, or `role="grid"`), ARIA labels
(`aria-label`, `aria-describedby`), and live regions (`role="status"`, `aria-live="polite"`)
to announce dynamic changes.

## Touch targets

Minimum **48×48px** (WCAG 2.5.5) for interactive elements; small visual controls (e.g.
checkboxes) get padding to reach 48×48. Pagination controls ≥ 44×44px. Comfortable table rows
(52px) and spacious tablet rows (64px) satisfy this.

## Colour independence

**Status must never be conveyed by colour alone.** Always pair colour with text, an icon, or a
pattern — e.g. a status badge shows both colour **and** label ("New", "Finalised"); validation
shows an icon + message, not just a red border.

## Testing checklist

- Automated audits (e.g. axe, Lighthouse).
- Full keyboard-only navigation.
- Screen-reader pass (NVDA / VoiceOver / TalkBack).
- Colour-blindness simulation.
- 200% zoom.
- Contrast verification.
