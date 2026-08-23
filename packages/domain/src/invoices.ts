import type { AdminWebInvoiceRowDto, AdminWebInvoicesListDto } from "../../shared/src/admin-web";

type InvoicesListFiltersInput = {
  shopDomain?: unknown;
  query?: unknown;
  date?: unknown;
  days?: unknown;
  sort?: unknown;
  limit?: unknown;
  offset?: unknown;
};

type InvoiceListServiceItem = {
  alegra_invoice_id?: unknown;
  invoiceId?: unknown;
  invoice_number?: unknown;
  processed_at?: unknown;
  updated_at?: unknown;
  customer_name?: unknown;
  customer_email?: unknown;
  total?: unknown;
  currency?: unknown;
  alegra_status?: unknown;
  status?: unknown;
};

type InvoiceListServiceResult = {
  items: InvoiceListServiceItem[];
  total: number;
  limit: number;
  offset: number;
};

export type NormalizedInvoicesListFilters = {
  shopDomain?: string;
  query?: string;
  date?: string;
  days?: number;
  sort?: string;
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

export function normalizeInvoicesListFilters(input: InvoicesListFiltersInput): NormalizedInvoicesListFilters {
  const days = coerceOptionalNumber(input.days);
  const limit = coerceOptionalNumber(input.limit);
  const offset = coerceOptionalNumber(input.offset);
  return {
    shopDomain: coerceOptionalString(input.shopDomain),
    query: coerceOptionalString(input.query),
    date: coerceOptionalString(input.date),
    days: typeof days === "number" && days > 0 ? days : undefined,
    sort: coerceOptionalString(input.sort) || "date_desc",
    limit: typeof limit === "number" && limit > 0 ? limit : 20,
    offset: typeof offset === "number" && offset >= 0 ? offset : 0,
  };
}

export function toAdminWebInvoiceRowDto(item: InvoiceListServiceItem): AdminWebInvoiceRowDto {
  const invoiceId = item.alegra_invoice_id
    ? String(item.alegra_invoice_id)
    : item.invoiceId
      ? String(item.invoiceId)
      : "";
  return {
    id: invoiceId,
    invoiceId,
    invoiceNumber: item.invoice_number ? String(item.invoice_number) : null,
    processedAt: item.processed_at
      ? new Date(String(item.processed_at)).toISOString()
      : item.updated_at
        ? new Date(String(item.updated_at)).toISOString()
        : null,
    customer: item.customer_name ? String(item.customer_name) : item.customer_email ? String(item.customer_email) : "-",
    total: typeof item.total === "number" ? item.total : item.total != null ? Number(item.total) : null,
    currency: item.currency ? String(item.currency) : null,
    status: item.alegra_status ? String(item.alegra_status) : item.status ? String(item.status) : null,
  };
}

export function toAdminWebInvoicesListDto(result: InvoiceListServiceResult): AdminWebInvoicesListDto {
  return {
    items: result.items.map(toAdminWebInvoiceRowDto),
    total: Number(result.total || 0),
    limit: Number(result.limit || 0),
    offset: Number(result.offset || 0),
  };
}
