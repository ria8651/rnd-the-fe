# UI Standards — Input Fields

> Source: <https://msupply-foundation.github.io/ui-standards/>. Link sections with `#` anchors.

## Field sizing and states

- **Labels:** static, positioned **above** the field, always visible.
- **Height:** 40px default; 36px in compact contexts (inline table edit, filter rows,
  toolbars, sidebars).
- **Padding:** 12px horizontal. **Border radius:** 6px.
- **Border:** 1px neutral default; shifts to the accent colour on focus, with a focus ring
  (see [accessibility › focus states](./accessibility.md#focus-states)).
- **Max width:** ~400px for short fields (codes, quantities); ~600px for extended fields
  (names, descriptions).
- Dropdowns and date pickers follow the same sizing, label, and focus rules. Dates are entered
  and displayed as DD/MM/YYYY. Toggles/checkboxes use the accent colour when on.

## Widths by content type

| Content | Width | Why |
|---------|-------|-----|
| Numeric quantity (pack qty, stock on hand) | 120px fixed | right-aligned; signals short input |
| Currency / price | 160px fixed | symbol + decimals |
| Date only (expiry, manufacture) | 160px min | DD/MM/YYYY + calendar icon |
| Date + time (delivery, created) | 200px min | room for time |
| Short codes (item, batch, barcode) | 160–200px | predictable length |
| Location / unit / status | 50% of container | pairs with another 50% field |
| Supplier / donor | 50% of container | variable length, pairs well |
| Manufacturer | 100% full width | long formal names |
| Campaign / program | 100% full width | compound names |
| Item name | 100% full width | names with strength/form exceed ~60 chars |

## Grid guidance

For ~640px detail views: 2-column rows split 50/50 (~286px each); 3-column rows split into
thirds (~190px each); full-row fields span the width (~592px). Everything collapses to a
single column on extra-small screens.
