import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ColumnDef } from '@tanstack/react-table';
import { DataGrid } from '../data-grid';
import { DensityProvider } from '../../../context/density-context';

interface Row {
  name: string;
  visits: number;
}
const columns: ColumnDef<Row, unknown>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'visits', header: 'Visits' },
];
const data: Row[] = [
  { name: 'Charlie', visits: 1 },
  { name: 'Alice', visits: 3 },
  { name: 'Bob', visits: 2 },
];

function renderGrid(rows: Row[] = data) {
  return render(
    <DensityProvider>
      <DataGrid columns={columns} data={rows} emptyText="Nothing here" />
    </DensityProvider>,
  );
}

describe('DataGrid', () => {
  it('renders headers and a row per data item', () => {
    renderGrid();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    // header row + 3 data rows
    expect(screen.getAllByRole('row')).toHaveLength(4);
  });

  it('shows the empty state when there is no data', () => {
    renderGrid([]);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('sorts alphabetically when a sortable header is clicked', async () => {
    renderGrid();
    await userEvent.click(screen.getByRole('button', { name: /Name/i }));
    const rows = screen.getAllByRole('row').slice(1); // drop header
    const names = rows.map((r) => within(r).getAllByRole('cell')[0].textContent);
    expect(names).toEqual(['Alice', 'Bob', 'Charlie']);
  });
});
