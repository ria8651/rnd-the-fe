/*
 * Value formatting (typography.md#value-formatting). Separators are fixed by the
 * format, not the device locale: dates DD/MM/YYYY, numbers comma-grouped with a
 * dot decimal, so a value reads the same on every device.
 */

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Parse a NaiveDate (YYYY-MM-DD) or ISO datetime to parts without TZ surprises for dates. */
function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** DD/MM/YYYY */
export function formatDate(value: string | null | undefined): string {
  // Date-only values (YYYY-MM-DD) must not shift across timezones.
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
  }
  const d = toDate(value);
  return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : '';
}

/** DD/MM/YYYY HH:mm (24-hour) */
export function formatDateTime(value: string | null | undefined): string {
  const d = toDate(value);
  if (!d) return '';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Thousands-separated number; trims to at most `maxFractionDigits` decimals. */
export function formatNumber(value: number | null | undefined, maxFractionDigits = 2): string {
  if (value == null || isNaN(value)) return '';
  return value.toLocaleString('en-US', { maximumFractionDigits: maxFractionDigits });
}

/** Signed / delta value: explicit +/−, zero unsigned, minus sign (not parentheses). */
export function formatSigned(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '';
  if (value === 0) return '0';
  const abs = formatNumber(Math.abs(value));
  return value > 0 ? `+${abs}` : `−${abs}`; // U+2212 minus
}

/** Currency: store symbol + 2 decimals. */
export function formatCurrency(value: number | null | undefined, symbol = '$'): string {
  if (value == null || isNaN(value)) return '';
  return `${symbol}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** For date input controls that expect an ISO date. */
export function toIsoDate(value: string | null | undefined): string {
  const d = toDate(value);
  if (!d) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
