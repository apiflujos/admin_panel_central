import type { AdminWebOperationRowDto, AdminWebOperationsListDto } from "../../shared/src/admin-web";

type OperationsFiltersInput = {
  days?: unknown;
};

type OperationServiceItem = {
  id?: unknown;
  orderNumber?: unknown;
  processedAt?: unknown;
  customer?: unknown;
  customerEmail?: unknown;
  products?: unknown;
  alegraStatus?: unknown;
  invoiceId?: unknown;
  invoiceNumber?: unknown;
  errorMessage?: unknown;
  einvoiceRequested?: unknown;
  einvoiceMissing?: unknown;
};

type OperationsServiceResult = {
  items: OperationServiceItem[];
};

export function normalizeOperationsDays(input: OperationsFiltersInput, fallback = 7) {
  const parsed = Number(input.days);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

export function toAdminWebOperationRowDto(item: OperationServiceItem): AdminWebOperationRowDto {
  return {
    id: String(item.id || ""),
    orderNumber: String(item.orderNumber || "-"),
    processedAt: item.processedAt ? new Date(String(item.processedAt)).toISOString() : null,
    customer: String(item.customer || "-"),
    customerEmail: item.customerEmail ? String(item.customerEmail) : null,
    products: String(item.products || "-"),
    alegraStatus: String(item.alegraStatus || "pendiente"),
    invoiceId: item.invoiceId ? String(item.invoiceId) : null,
    invoiceNumber: item.invoiceNumber ? String(item.invoiceNumber) : null,
    errorMessage: item.errorMessage ? String(item.errorMessage) : null,
    einvoiceRequested: Boolean(item.einvoiceRequested),
    einvoiceMissing: Array.isArray(item.einvoiceMissing) ? item.einvoiceMissing.map((entry) => String(entry)) : [],
  };
}

export function toAdminWebOperationsListDto(result: OperationsServiceResult): AdminWebOperationsListDto {
  const items = result.items.map(toAdminWebOperationRowDto);
  return {
    items,
    summary: {
      invoicedCount: items.filter((item) => item.alegraStatus === "facturado").length,
      failedCount: items.filter((item) => Boolean(item.errorMessage)).length,
      einvoicePendingCount: items.filter((item) => item.einvoiceRequested && item.einvoiceMissing.length > 0).length,
    },
  };
}
