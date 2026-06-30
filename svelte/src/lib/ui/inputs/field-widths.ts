/** Named widths by content type, from inputs.md › Widths by content type. */
export const fieldWidths = {
	qty: '120px',
	currency: '160px',
	date: '160px',
	datetime: '200px',
	code: '180px',
	half: '50%',
	full: '100%'
} as const;

export type FieldWidth = keyof typeof fieldWidths;

export function resolveWidth(w: FieldWidth | string | undefined): string | undefined {
	if (!w) return undefined;
	return w in fieldWidths ? fieldWidths[w as FieldWidth] : w;
}
