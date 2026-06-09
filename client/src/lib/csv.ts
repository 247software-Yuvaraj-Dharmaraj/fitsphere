// Minimal CSV export — builds a CSV string from rows and triggers a download.
type Cell = string | number | null | undefined;

function escape(value: Cell): string {
  const s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function downloadCsv<T>(
  filename: string,
  columns: { key: keyof T; header: string }[],
  rows: T[],
): void {
  const head = columns.map((c) => escape(c.header)).join(',');
  const body = rows
    .map((row) => columns.map((c) => escape(row[c.key] as Cell)).join(','))
    .join('\n');
  const csv = `${head}\n${body}`;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
