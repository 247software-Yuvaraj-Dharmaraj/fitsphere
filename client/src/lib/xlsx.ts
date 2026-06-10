// Build an .xlsx workbook from rows and trigger a download. xlsx is imported
// dynamically so the (sizeable) SheetJS library only loads when the user exports.
type Cell = string | number | null | undefined;

export async function downloadXlsx<T>(
  filename: string,
  sheetName: string,
  columns: { key: keyof T; header: string }[],
  rows: T[],
): Promise<void> {
  const XLSX = await import('xlsx');
  const data = rows.map((row) =>
    Object.fromEntries(columns.map((c) => [c.header, (row[c.key] ?? '') as Cell])),
  );
  const worksheet = XLSX.utils.json_to_sheet(data, { header: columns.map((c) => c.header) });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}
