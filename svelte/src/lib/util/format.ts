// Value formatting per spec/ui-standards/typography.md#value-formatting.
// Separators fixed by format (not device locale): DD/MM/YYYY dates, comma thousands.

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** DD/MM/YYYY. Accepts ISO date/datetime strings or Date. */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** DD/MM/YYYY HH:mm (24-hour). */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '';
  return `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Thousands separators, no forced decimals. */
export function formatNumber(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '';
  const rounded = Math.round(value * 1e6) / 1e6;
  return rounded.toLocaleString('en-US');
}

/** Currency: store symbol + 2 decimals (symbol defaults to $ when unknown). */
export function formatCurrency(value: number | null | undefined, symbol = '$'): string {
  if (value == null || isNaN(value)) return '';
  return `${symbol}${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Signed delta: explicit +/−, zero shown as "0" with no sign. Uses U+2212 minus. */
export function formatSigned(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '';
  if (value === 0) return '0';
  const abs = formatNumber(Math.abs(value));
  return value > 0 ? `+${abs}` : `−${abs}`;
}

/** YYYY-MM-DD for API NaiveDate inputs. */
export function toIsoDate(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
