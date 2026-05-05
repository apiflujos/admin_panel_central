import type { ReactNode } from "react";

type DataTableColumn<T> = {
  key: keyof T | string;
  header: string;
  render: (row: T) => ReactNode;
  columnClassName?: string;
};

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  emptyState = "Sin datos disponibles.",
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey?: (row: T, index: number) => string | number;
  emptyState?: ReactNode;
}) {
  return (
    <div className="dataTable-wrap">
      <table className="dataTable">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)} className={column.columnClassName}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, rowIndex) => (
              <tr key={String(getRowKey ? getRowKey(row, rowIndex) : rowIndex)}>
                {columns.map((column) => (
                  <td key={String(column.key)} className={column.columnClassName}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className="dataTable-empty" colSpan={columns.length}>
                {emptyState}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
