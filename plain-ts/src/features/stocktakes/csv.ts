// CSV export for the stocktake list (J9 / AC-L3). Values use the same display
// formats as the table (typography.md#value-formatting).

import { statusLabel } from '../../domain/rules.ts';
import { formatDate } from '../../domain/format.ts';
import type { Stocktake } from '../../domain/types.ts';

function csvCell(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportStocktakesCsv(rows: Stocktake[]): void {
  const headers = ['Number', 'Status', 'Description', 'Comment', 'Created', 'Finalised', 'Locked'];
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.stocktakeNumber,
        statusLabel(r.status),
        r.description ?? '',
        r.comment ?? '',
        formatDate(r.createdDatetime),
        r.finalisedDatetime ? formatDate(r.finalisedDatetime) : '',
        r.isLocked ? 'Yes' : 'No',
      ]
        .map(csvCell)
        .join(','),
    );
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'stocktakes.csv';
  a.click();
  URL.revokeObjectURL(url);
}
