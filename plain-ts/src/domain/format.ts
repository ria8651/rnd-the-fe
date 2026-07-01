// Value formatting, applied consistently everywhere a value of a type appears.
// Formats are fixed by the spec, not the device locale:
// ../../spec/ui-standards/typography.md#value-formatting

/** DD/MM/YYYY. Accepts an ISO date or datetime string. */
export function formatDate(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** DD/MM/YYYY HH:mm (24-hour). */
export function formatDateTime(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${formatDate(value)} ${hh}:${min}`;
}

/** Thousands-separated number; trims noise decimals but keeps meaningful ones. */
export function formatNumber(value?: number | null): string {
  if (value == null || Number.isNaN(value)) return '';
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/** Explicit +/- sign; zero shows as "0" unsigned. Uses a real minus glyph. */
export function formatSigned(value: number): string {
  if (value === 0) return '0';
  const abs = formatNumber(Math.abs(value));
  return value > 0 ? `+${abs}` : `−${abs}`;
}

/** For an <input type="date">, which needs YYYY-MM-DD regardless of display. */
export function toDateInputValue(value?: string | null): string {
  if (!value) return '';
  return value.slice(0, 10);
}
