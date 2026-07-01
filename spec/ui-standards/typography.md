# UI Standards — Typography

> Source: <https://msupply-foundation.github.io/ui-standards/>. Link sections with `#` anchors.

## Font family

A single humanist sans-serif is used throughout, with a system fallback stack so text renders before/without the webfont. ⚠️ VERIFY the exact face against the brand (current app `theme.ts`); this spec uses **Inter** with a `system-ui, -apple-system, Segoe UI, Roboto, sans-serif` fallback as a sensible default. Numeric contexts additionally request **tabular figures** (see below).

## Font sizes

| Context | Size | Weight | Line height |
|---------|------|--------|-------------|
| Desktop header | 14px | 600 | 20px |
| Desktop cell | 14px | 400 | 20px |
| Tablet cell | 16px | 400 | 24px |

Distinguish headers from cells by **weight** (600 vs 400), not by colour or size alone, to preserve hierarchy without extra visual noise.

## Value formatting

Apply consistently everywhere a value of that type appears.

| Value | Format | Example |
|-------|--------|---------|
| Date | DD/MM/YYYY | 03/05/2028 |
| Date + time | DD/MM/YYYY HH:mm (24-hour) | 03/05/2028 14:08 |
| Currency | symbol + 2 decimals | $240.00 |
| Number | thousands separators | 2,000 |
| Percentage | 1 decimal | 95.5% |
| Signed / delta | explicit sign, 0 unsigned | +12 · −340 · 0 |

Numeric values use tabular (fixed-width) figures so digits align in columns (see [tables › data type alignment](./tables.md#data-type-alignment)).

### Locale, separators & symbols

- **Separators are fixed by the format, not the device locale:** dates are always DD/MM/YYYY and numbers use a comma thousands separator + dot decimal, regardless of the browser/OS locale — so a value reads the same on every device. ⚠️ VERIFY against the running app / upstream (some deployments may localise separators).
- **Currency symbol** comes from the **store's configured currency**, not a hard-coded `$`. A value never shows a currency amount without its symbol.
- **Signed / delta values** (e.g. a stocktake line's counted − snapshot [difference](../stocktakes/05-ui-surface.md#line-table)) show an explicit `+`/`−`; zero shows as `0` with no sign. Negatives use a sign prefix, **not** parentheses.
