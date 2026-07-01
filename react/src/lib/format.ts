/**
 * Value formatting per spec/ui-standards/typography.md#value-formatting.
 * Separators are fixed by the format, not the device locale, so a value reads the
 * same on every device: dates DD/MM/YYYY, numbers with comma thousands + dot decimal.
 */

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** DD/MM/YYYY */
export function formatDate(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** DD/MM/YYYY HH:mm (24-hour) */
export function formatDateTime(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '';
  return `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const numberFmt = new Intl.NumberFormat('en-GB'); // comma thousands, dot decimal

/** Thousands separators (e.g. 2,000). */
export function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '';
  return numberFmt.format(value);
}

/** Currency: store symbol + 2 decimals. A value never shows without its symbol. */
export function formatCurrency(
  value: number | null | undefined,
  symbol = '$',
): string {
  if (value == null || Number.isNaN(value)) return '';
  return `${symbol}${value.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Percentage: 1 decimal. */
export function formatPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '';
  return `${value.toFixed(1)}%`;
}

/**
 * Signed / delta: explicit +/-, zero unsigned. Negatives use a sign prefix,
 * not parentheses (typography.md#locale-separators--symbols).
 */
export function formatSigned(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '0';
  if (value === 0) return '0';
  const magnitude = formatNumber(Math.abs(value));
  return value > 0 ? `+${magnitude}` : `−${magnitude}`; // U+2212 minus sign
}
