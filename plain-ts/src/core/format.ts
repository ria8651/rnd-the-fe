// Value formatting per ui-standards/typography.md § value-formatting.
// Separators are fixed by format (DD/MM/YYYY, comma thousands, dot decimal),
// not by device locale, so a value reads the same on every device.

function pad(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

/** Parse a NaiveDate (YYYY-MM-DD) or ISO datetime without timezone surprises. */
function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  // NaiveDate 'YYYY-MM-DD' -> treat as local date
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDate(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function formatDateTime(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '';
  return `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Thousands separators, up to `maxDecimals` (default 0), dot decimal. */
export function formatNumber(value: number | null | undefined, maxDecimals = 0): string {
  if (value == null || isNaN(value)) return '';
  const fixed = maxDecimals > 0 ? value.toFixed(maxDecimals) : String(Math.round(value));
  const [intPart, dec] = fixed.split('.');
  const withSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return dec ? `${withSep}.${dec}` : withSep;
}

export function formatCurrency(value: number | null | undefined, symbol = '$'): string {
  if (value == null || isNaN(value)) return '';
  return `${symbol}${formatNumber(value, 2)}`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '';
  return `${value.toFixed(1)}%`;
}

/** Signed delta: explicit +/−; zero shows as 0 with no sign. Uses U+2212 minus. */
export function formatSigned(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '';
  if (value === 0) return '0';
  const abs = formatNumber(Math.abs(value), Number.isInteger(value) ? 0 : 2);
  return value > 0 ? `+${abs}` : `−${abs}`;
}
