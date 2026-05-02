import type { AdminWebOrderRowDto, AdminWebOrdersListDto } from "../../shared/src/admin-web";

type OrdersListFiltersInput = {
  shopDomain?: unknown;
  query?: unknown;
  date?: unknown;
  days?: unknown;
  sort?: unknown;
  limit?: unknown;
  offset?: unknown;
};

type OrdersListServiceItem = {
  shopify_order_id?: unknown;
  alegra_invoice_id?: unknown;
  shopify_order_number?: unknown;
  customer_name?: unknown;
  customer_email?: unknown;
  products_summary?: unknown;
  processed_at?: unknown;
  updated_at?: unknown;
  alegra_status?: unknown;
  invoice_number?: unknown;
};

type OrdersListServiceResult = {
  items: OrdersListServiceItem[];
  total: number;
  limit: number;
  offset: number;
};

type OrderInvoiceOverrideLike = {
  einvoiceRequested?: unknown;
};

function coerceOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function coerceOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseBooleanLike(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  const lowered = String(value ?? "").trim().toLowerCase();
  if (!lowered) return fallback;
  if (["1", "true", "yes", "on"].includes(lowered)) return true;
  if (["0", "false", "no", "off"].includes(lowered)) return false;
  return fallback;
}

export type NormalizedOrdersListFilters = {
  shopDomain?: string;
  query?: string;
  date?: string;
  days?: number;
  sort?: string;
  limit?: number;
  offset?: number;
};

export function normalizeOrdersListFilters(input: OrdersListFiltersInput): NormalizedOrdersListFilters {
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

export function toAdminWebOrderRowDto(params: {
  row: OrdersListServiceItem;
  override: OrderInvoiceOverrideLike | null;
  einvoiceEnabled: boolean;
  missing: string[];
}): AdminWebOrderRowDto {
  const { row, override, einvoiceEnabled, missing } = params;
  const shopifyId = row.shopify_order_id ? String(row.shopify_order_id) : "";
  const alegraStatus = String(row.alegra_status || (row.alegra_invoice_id ? "facturado" : "pendiente"));

  return {
    id: shopifyId || "",
    shopifyId: shopifyId || null,
    orderNumber: String(row.shopify_order_number || row.alegra_invoice_id || "-"),
    processedAt: row.processed_at
      ? new Date(String(row.processed_at)).toISOString()
      : row.updated_at
        ? new Date(String(row.updated_at)).toISOString()
        : null,
    customer: String(row.customer_name || row.customer_email || "-"),
    customerEmail: row.customer_email ? String(row.customer_email) : null,
    products: String(row.products_summary || "-"),
    alegraStatus,
    invoiceId: row.alegra_invoice_id ? String(row.alegra_invoice_id) : null,
    invoiceNumber: row.invoice_number ? String(row.invoice_number) : null,
    einvoiceRequested: einvoiceEnabled ? parseBooleanLike(override?.einvoiceRequested, false) : false,
    einvoiceMissing: missing,
  };
}

export function toAdminWebOrdersListDto(params: {
  result: OrdersListServiceResult;
  getOverride: (shopifyId: string) => OrderInvoiceOverrideLike | null;
  getMissing: (shopifyId: string, override: OrderInvoiceOverrideLike | null) => string[];
  einvoiceEnabled: boolean;
}): AdminWebOrdersListDto {
  const items = params.result.items.map((row) => {
    const shopifyId = row.shopify_order_id ? String(row.shopify_order_id) : "";
    const override = shopifyId ? params.getOverride(shopifyId) : null;
    const missing = shopifyId ? params.getMissing(shopifyId, override) : [];
    return toAdminWebOrderRowDto({
      row,
      override,
      einvoiceEnabled: params.einvoiceEnabled,
      missing,
    });
  });

  const invoicedCount = items.filter((item) => item.alegraStatus === "facturado").length;
  const einvoicePendingCount = items.filter((item) => item.einvoiceRequested && item.einvoiceMissing.length > 0).length;

  return {
    items,
    total: params.result.total,
    limit: params.result.limit,
    offset: params.result.offset,
    summary: {
      invoicedCount,
      pendingCount: items.length - invoicedCount,
      einvoicePendingCount,
    },
  };
}
