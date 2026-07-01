// Value formatting per spec/ui-standards/typography.md#value-formatting.
// Separators are fixed by the format, not the device locale.

function pad(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

/** DD/MM/YYYY. Accepts ISO date or datetime strings. */
export function formatDate(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** DD/MM/YYYY HH:mm (24-hour). */
export function formatDateTime(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return `${formatDate(value)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Thousands separator (comma), no forced decimals. */
export function formatNumber(value?: number | null): string {
  if (value == null || isNaN(value)) return '';
  return value.toLocaleString('en-US');
}

/** Explicit sign; 0 shows unsigned. Uses − (minus), not parentheses. */
export function formatSigned(value?: number | null): string {
  if (value == null || isNaN(value)) return '';
  if (value === 0) return '0';
  const abs = Math.abs(value).toLocaleString('en-US');
  return value > 0 ? `+${abs}` : `−${abs}`;
}
