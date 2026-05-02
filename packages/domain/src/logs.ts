import type { AdminWebLogRowDto, AdminWebLogsListDto } from "../../shared/src/admin-web";

type LogsFiltersInput = {
  status?: unknown;
  orderId?: unknown;
  entity?: unknown;
  direction?: unknown;
  from?: unknown;
  to?: unknown;
};

type SyncLogListItem = {
  id: number;
  entity: string;
  direction: string;
  status: string;
  message: string | null;
  created_at: string;
  order_id: string | null;
};

type SyncLogListResult = {
  items: SyncLogListItem[];
  filters: {
    status?: string;
    orderId?: string;
    entity?: string;
    direction?: string;
    from?: string;
    to?: string;
  };
};

function coerceOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function normalizeLogsFilters(input: LogsFiltersInput) {
  return {
    status: coerceOptionalString(input.status),
    orderId: coerceOptionalString(input.orderId),
    entity: coerceOptionalString(input.entity),
    direction: coerceOptionalString(input.direction),
    from: coerceOptionalString(input.from),
    to: coerceOptionalString(input.to),
  };
}

export function toAdminWebLogRowDto(row: SyncLogListItem): AdminWebLogRowDto {
  return {
    id: row.id,
    entity: row.entity,
    direction: row.direction,
    status: row.status,
    message: row.message,
    createdAt: new Date(row.created_at).toISOString(),
    orderId: row.order_id,
  };
}

export function toAdminWebLogsListDto(result: SyncLogListResult): AdminWebLogsListDto {
  const items = result.items.map(toAdminWebLogRowDto);
  return {
    items,
    filters: result.filters,
    summary: {
      total: items.length,
      failedCount: items.filter((item) => item.status === "fail").length,
      retryingCount: items.filter((item) => item.status === "retrying").length,
    },
  };
}
