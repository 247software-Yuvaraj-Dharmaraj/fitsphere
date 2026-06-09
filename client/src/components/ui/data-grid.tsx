import { useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type RowSelectionState,
  type SortingState,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useDensity } from '../../context/density-context';

interface ServerPagination {
  page: number; // 0-based
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

interface DataGridProps<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<T, any>[];
  data: T[];
  minWidth?: string;
  emptyText?: string;
  // Server-side mode: pass controlled sorting + pagination. Omit for client-side.
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  pagination?: ServerPagination;
  loading?: boolean;
  // Row selection (controlled): provide all three to enable checkboxes.
  getRowId?: (row: T) => string;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
}

/** Sortable, density-aware data grid (TanStack Table). Supports client-side
 *  sorting by default, or server-side sorting + pagination when controlled. */
export function DataGrid<T>({
  columns,
  data,
  minWidth = '640px',
  emptyText,
  sorting,
  onSortingChange,
  pagination,
  loading,
  getRowId,
  rowSelection,
  onRowSelectionChange,
}: DataGridProps<T>) {
  const { density } = useDensity();
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const manual = sorting !== undefined && onSortingChange !== undefined;
  const selectable = Boolean(getRowId && rowSelection && onRowSelectionChange);

  const table = useReactTable({
    data,
    columns,
    state: { sorting: manual ? sorting : internalSorting, rowSelection: rowSelection ?? {} },
    onSortingChange: manual ? onSortingChange : setInternalSorting,
    onRowSelectionChange,
    enableRowSelection: selectable,
    getRowId,
    manualSorting: manual,
    getCoreRowModel: getCoreRowModel(),
    ...(manual ? {} : { getSortedRowModel: getSortedRowModel() }),
  });

  const cellPad = density === 'compact' ? 'px-3 py-1.5' : 'px-4 py-3';
  const rows = table.getRowModel().rows;
  const colCount = columns.length + (selectable ? 1 : 0);

  const totalPages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize)) : 1;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className={`overflow-x-auto ${loading ? 'opacity-60 transition' : ''}`}>
        <table className="w-full text-left text-sm" style={{ minWidth }}>
          <thead className="border-b border-slate-200 bg-slate-50 text-xs tracking-wide text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {selectable && (
                  <th scope="col" className={`${cellPad} w-10`}>
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      checked={table.getIsAllRowsSelected()}
                      ref={(el) => {
                        if (el) el.indeterminate = table.getIsSomeRowsSelected();
                      }}
                      onChange={table.getToggleAllRowsSelectedHandler()}
                    />
                  </th>
                )}
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  const canSort = header.column.getCanSort();
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={
                        sorted === 'asc'
                          ? 'ascending'
                          : sorted === 'desc'
                            ? 'descending'
                            : undefined
                      }
                      className={`${cellPad} font-medium`}
                    >
                      {canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 uppercase hover:text-slate-700 focus-visible:underline focus-visible:outline-none dark:hover:text-slate-200"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <span aria-hidden className="text-[10px]">
                            {sorted === 'asc' ? '▲' : sorted === 'desc' ? '▼' : '↕'}
                          </span>
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={colCount}
                  className="px-4 py-10 text-center text-slate-400 dark:text-slate-500"
                >
                  {emptyText ?? 'No data'}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className={`transition hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                    row.getIsSelected() ? 'bg-brand-50/60 dark:bg-brand-500/10' : ''
                  }`}
                >
                  {selectable && (
                    <td className={cellPad}>
                      <input
                        type="checkbox"
                        aria-label="Select row"
                        checked={row.getIsSelected()}
                        onChange={row.getToggleSelectedHandler()}
                      />
                    </td>
                  )}
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className={cellPad}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.total > 0 && (
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <span>
            {pagination.page * pagination.pageSize + 1}–
            {Math.min((pagination.page + 1) * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page === 0}
              className="rounded-md p-1 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            <span>
              {pagination.page + 1} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page + 1 >= totalPages}
              className="rounded-md p-1 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
