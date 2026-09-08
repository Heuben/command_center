/* CSV export utility — small, dependency-free, browser-native.
 * Triggers a download for the user; no server round-trip required. */

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = typeof value === 'string' ? value : String(value);
  // RFC 4180: wrap in double quotes if it contains comma, quote, CR, or LF.
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

type Row = Record<string, unknown>;
type Column<TRow extends Row> = {
  key: keyof TRow & string;
  header: string;
  format?: (v: TRow[keyof TRow], row: TRow) => string;
};

export function rowsToCsv<TRow extends Row>(rows: TRow[], columns: Column<TRow>[]): string {
  const header = columns.map((c) => escapeCell(c.header)).join(',');
  const body = rows.
  map((row) =>
  columns.
  map((c) => {
    const raw = row[c.key];
    const formatted = c.format ? c.format(raw as TRow[keyof TRow], row) : raw;
    return escapeCell(formatted);
  }).
  join(',')
  ).
  join('\r\n');
  return `${header}\r\n${body}`;
}

export function downloadCsv(filename: string, csv: string): void {
  // Prepend BOM so Excel correctly interprets UTF-8.
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Free the object URL once the click is dispatched.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}