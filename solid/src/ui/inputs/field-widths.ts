/**
 * Fixed field widths by content type (spec/ui-standards/inputs.md › Widths by content type).
 * Use as a CSS width value; full-width content types return '100%'.
 */
export const fieldWidth = {
  quantity: '120px',
  currency: '160px',
  date: '160px',
  datetime: '200px',
  code: '180px',
  half: '50%',
  full: '100%'
} as const;

export type FieldWidth = keyof typeof fieldWidth;
