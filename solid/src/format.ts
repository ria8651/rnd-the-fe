/**
 * Value formatting — applied consistently wherever a value of a given type appears
 * (spec/ui-standards/typography.md › Value formatting). Formats are fixed, not derived
 * from the device locale, so a value reads the same on every device: dates DD/MM/YYYY,
 * numbers with a comma thousands separator + dot decimal. Numeric output is meant to
 * render with tabular figures (the `.tabular` / `[data-numeric]` rule in app.css).
 */

const GROUP = 'en-GB'; // fixed grouping/decimal locale, independent of the device

/** Parse a NaiveDate (YYYY-MM-DD) into a local Date without timezone drift. */
function parseDateOnly(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(s);
}

/** A date as DD/MM/YYYY. Accepts a Date, an ISO datetime, or a NaiveDate (YYYY-MM-DD). */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = typeof value === 'string' ? parseDateOnly(value) : value;
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** Date + time as DD/MM/YYYY HH:mm (24-hour). */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${formatDate(d)} ${hh}:${min}`;
}

/** Whole/decimal number with thousands separators. `maxDecimals` caps fractional digits. */
export function formatNumber(value: number | null | undefined, maxDecimals = 2): string {
  if (value == null || Number.isNaN(value)) return '';
  return new Intl.NumberFormat(GROUP, { maximumFractionDigits: maxDecimals }).format(value);
}

/** Currency: symbol + value with exactly 2 decimals and thousands separators. The symbol
 *  comes from the store's configured currency, never a hard-coded '$' (typography.md). */
export function formatCurrency(value: number | null | undefined, symbol = '$'): string {
  if (value == null || Number.isNaN(value)) return '';
  return `${symbol}${new Intl.NumberFormat(GROUP, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)}`;
}

/** Percentage with 1 decimal (95.5 → "95.5%"). */
export function formatPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '';
  return `${new Intl.NumberFormat(GROUP, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value)}%`;
}

/** Signed delta for difference columns: explicit +/−, thousands separators, 0 unsigned.
 *  Uses U+2212 MINUS SIGN so digits align under tabular figures (typography.md). */
export function formatDelta(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '';
  if (value === 0) return '0';
  const sign = value > 0 ? '+' : '−';
  return `${sign}${new Intl.NumberFormat(GROUP).format(Math.abs(value))}`;
}
