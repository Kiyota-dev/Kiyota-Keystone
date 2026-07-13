import { Activity } from "lucide-react";
import { Alert } from "./ui/Alert.tsx";
import type { DataTabState } from "../Dashboard.tsx";

interface DataTableProps<T extends Record<string, unknown>> {
  state: DataTabState<T>;
  columns: string[];
  rows: unknown[];
  emptyMessage?: string;
  renderRowActions?: (row: Record<string, unknown>) => React.ReactNode;
}

export function DataTable<T extends Record<string, unknown>>({
  state,
  columns,
  rows,
  emptyMessage = "No data found.",
  renderRowActions,
}: DataTableProps<T>) {
  if (state.loading) {
    return (
      <div className="py-20 flex flex-col items-center gap-3 text-muted-foreground">
        <Activity className="w-8 h-8 animate-spin text-gold" />
        <p className="text-[14px]">Loading…</p>
      </div>
    );
  }

  if (state.error) {
    return (
      <Alert variant="error">
        Unable to load data: {state.error}
      </Alert>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-theme/30">
            {columns.map((col) => (
              <th key={col} className="text-left py-2 pr-4 txt-muted font-medium uppercase tracking-wide">
                {col}
              </th>
            ))}
            {renderRowActions && <th className="text-left py-2 pr-4 txt-muted font-medium uppercase tracking-wide">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const record = row as Record<string, unknown>;
            return (
              <tr key={index} className="border-b border-theme/10 last:border-0">
                {columns.map((col) => (
                  <td key={col} className="py-2 pr-4 txt-body break-all">
                    {formatCellValue(record[col])}
                  </td>
                ))}
                {renderRowActions && <td className="py-2 pr-4">{renderRowActions(record)}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && <p className="text-[13px] txt-muted mt-3">{emptyMessage}</p>}
    </div>
  );
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
