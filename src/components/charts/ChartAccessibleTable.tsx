import React from 'react';

export interface ChartAccessibleTableColumn<T> {
  /** Must name an actual field on T - catches column/row-shape drift at compile time. */
  key: keyof T & string;
  label: string;
  render: (row: T) => React.ReactNode;
}

export interface ChartAccessibleTableProps<T> {
  caption: string;
  columns: ChartAccessibleTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => React.Key;
}

/**
 * Screen-reader-only data table twin for a chart that otherwise relies on color
 * alone (pie/treemap slices). Render inside a `sr-only` wrapper alongside the
 * visual chart; this component renders only the semantic table markup.
 */
export function ChartAccessibleTable<T>({
  caption,
  columns,
  rows,
  rowKey,
}: ChartAccessibleTableProps<T>): React.ReactElement {
  return (
    <table>
      <caption>{caption}</caption>
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key} scope="col">
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={rowKey(row)}>
            {columns.map((col) => (
              <td key={col.key}>{col.render(row)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
