/**
 * Value formatting — applied consistently wherever a value of that type appears
 * (typography.md › Value formatting). Dates are locale-independent DD/MM/YYYY;
 * numbers use thousands separators; currency is symbol + 2 decimals; percentages
 * 1 decimal. All numeric output is meant to render with tabular figures (the
 * `.tabular` / `[data-numeric]` rule in app.css).
 */

const groupFmt = new Intl.NumberFormat('en-GB');

/** A date as DD/MM/YYYY. Accepts a Date, an ISO string, or a NaiveDate (YYYY-MM-DD). */
export function formatDate(value: string | Date | null | undefined): string {
	if (!value) return '';
	const d = typeof value === 'string' ? parseDateOnly(value) : value;
	if (!d || Number.isNaN(d.getTime())) return '';
	const dd = String(d.getDate()).padStart(2, '0');
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const yyyy = d.getFullYear();
	return `${dd}/${mm}/${yyyy}`;
}

/** Date + time as DD/MM/YYYY HH:mm (24h). */
export function formatDateTime(value: string | Date | null | undefined): string {
	if (!value) return '';
	const d = typeof value === 'string' ? new Date(value) : value;
	if (!d || Number.isNaN(d.getTime())) return '';
	const hh = String(d.getHours()).padStart(2, '0');
	const min = String(d.getMinutes()).padStart(2, '0');
	return `${formatDate(d)} ${hh}:${min}`;
}

/** Whole/decimal number with thousands separators. `maxDecimals` caps fractional digits. */
export function formatNumber(value: number | null | undefined, maxDecimals = 2): string {
	if (value == null || Number.isNaN(value)) return '';
	return new Intl.NumberFormat('en-GB', { maximumFractionDigits: maxDecimals }).format(value);
}

/** Currency: symbol + value with exactly 2 decimals and thousands separators. */
export function formatCurrency(
	value: number | null | undefined,
	symbol = '$'
): string {
	if (value == null || Number.isNaN(value)) return '';
	return `${symbol}${new Intl.NumberFormat('en-GB', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(value)}`;
}

/** Percentage with 1 decimal. Expects a percentage value (95.5 → "95.5%"). */
export function formatPercent(value: number | null | undefined): string {
	if (value == null || Number.isNaN(value)) return '';
	return `${new Intl.NumberFormat('en-GB', {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1
	}).format(value)}%`;
}

/** Signed difference for delta columns: +/− with thousands separators (0 shows as "0"). */
export function formatDelta(value: number | null | undefined): string {
	if (value == null || Number.isNaN(value)) return '';
	if (value === 0) return '0';
	const sign = value > 0 ? '+' : '−'; // U+2212 minus for alignment
	return `${sign}${groupFmt.format(Math.abs(value))}`;
}

/** Parse a YYYY-MM-DD (NaiveDate) into a local Date without timezone drift. */
function parseDateOnly(s: string): Date {
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
	if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
	return new Date(s);
}
