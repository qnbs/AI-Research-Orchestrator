import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { ChartAccessibleTable } from './ChartAccessibleTable';

interface Row {
  id: string;
  label: string;
  count: number;
}

const rows: Row[] = [
  { id: 'a', label: 'Review', count: 5 },
  { id: 'b', label: 'Trial', count: 3 },
];

describe('ChartAccessibleTable', () => {
  it('renders a caption, column headers, and one row per data item', () => {
    render(
      <ChartAccessibleTable<Row>
        caption="Article types"
        columns={[
          { key: 'label', label: 'Type', render: (r) => r.label },
          { key: 'count', label: 'Articles', render: (r) => r.count },
        ]}
        rows={rows}
        rowKey={(r) => r.id}
      />,
    );

    expect(screen.getByText('Article types')).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'Type' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Articles' })).toBeInTheDocument();

    const bodyRows = within(table).getAllByRole('row').slice(1);
    expect(bodyRows).toHaveLength(2);
    expect(within(bodyRows[0]).getByText('Review')).toBeInTheDocument();
    expect(within(bodyRows[0]).getByText('5')).toBeInTheDocument();
    expect(within(bodyRows[1]).getByText('Trial')).toBeInTheDocument();
    expect(within(bodyRows[1]).getByText('3')).toBeInTheDocument();
  });

  it('renders an empty body when there are no rows', () => {
    render(
      <ChartAccessibleTable<Row>
        caption="Empty"
        columns={[{ key: 'label', label: 'Type', render: (r) => r.label }]}
        rows={[]}
        rowKey={(r) => r.id}
      />,
    );
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(1); // header row only
  });
});
