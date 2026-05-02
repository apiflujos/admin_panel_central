import type { ReactNode } from "react";

type DataTableColumn<T> = {
  key: keyof T | string;
  header: string;
  render: (row: T) => ReactNode;
};

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey?: (row: T, index: number) => string | number;
}) {
  return (
    <table className="dataTable">
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={String(column.key)}>{column.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={String(getRowKey ? getRowKey(row, rowIndex) : rowIndex)}>
            {columns.map((column) => (
              <td key={String(column.key)}>{column.render(row)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
