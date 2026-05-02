import type { AdminWebContactRowDto, AdminWebContactsListDto } from "../../shared/src/admin-web";

type ContactsListFiltersInput = {
  query?: unknown;
  status?: unknown;
  source?: unknown;
  from?: unknown;
  to?: unknown;
  limit?: unknown;
  offset?: unknown;
  shopDomain?: unknown;
};

export type ContactsListServiceItem = {
  id: number | string;
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  doc?: unknown;
  source?: unknown;
  sync_status?: unknown;
  updated_at?: unknown;
};

export type ContactsListServiceResult = {
  items: ContactsListServiceItem[];
  total: number;
  limit: number;
  offset: number;
};

export type NormalizedContactsListFilters = {
  shopDomain?: string;
  query?: string;
  status?: string;
  source?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

function coerceOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function coerceOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function normalizeContactsListFilters(input: ContactsListFiltersInput): NormalizedContactsListFilters {
  return {
    shopDomain: coerceOptionalString(input.shopDomain),
    query: coerceOptionalString(input.query),
    status: coerceOptionalString(input.status),
    source: coerceOptionalString(input.source),
    from: coerceOptionalString(input.from),
    to: coerceOptionalString(input.to),
    limit: coerceOptionalNumber(input.limit),
    offset: coerceOptionalNumber(input.offset),
  };
}

export function toAdminWebContactRowDto(item: ContactsListServiceItem): AdminWebContactRowDto {
  return {
    id: Number(item.id),
    name: String(item.name || "-"),
    email: item.email ? String(item.email) : null,
    phone: item.phone ? String(item.phone) : null,
    document: item.doc ? String(item.doc) : null,
    source: item.source ? String(item.source) : null,
    syncStatus: String(item.sync_status || "pending"),
    updatedAt: item.updated_at ? new Date(String(item.updated_at)).toISOString() : null,
  };
}

export function toAdminWebContactsListDto(result: ContactsListServiceResult): AdminWebContactsListDto {
  return {
    items: result.items.map(toAdminWebContactRowDto),
    total: Number(result.total || 0),
    limit: Number(result.limit || 0),
    offset: Number(result.offset || 0),
  };
}
