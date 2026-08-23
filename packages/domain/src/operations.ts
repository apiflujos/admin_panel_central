import type { AdminWebOperationRowDto, AdminWebOperationsListDto } from "../../shared/src/admin-web";

type OperationsFiltersInput = {
  days?: unknown;
};

type OperationServiceItem = {
  id?: unknown;
  shopDomain?: unknown;
  storeName?: unknown;
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
  actionability?: unknown;
};

type OperationsServiceResult = {
  items: OperationServiceItem[];
};

type OperationActionabilityInput = {
  sync?: { enabled?: unknown; reason?: unknown };
  retryInvoice?: { enabled?: unknown; reason?: unknown };
  payment?: { enabled?: unknown; reason?: unknown };
  cancel?: { enabled?: unknown; reason?: unknown };
  editEinvoice?: { enabled?: unknown; reason?: unknown };
  pdf?: { enabled?: unknown; reason?: unknown; invoiceId?: unknown };
};

function toActionState(input: { enabled?: unknown; reason?: unknown }) {
  return {
    enabled: Boolean(input.enabled),
    reason: typeof input.reason === "string" && input.reason.trim() ? input.reason : undefined,
  };
}

export function normalizeOperationsDays(input: OperationsFiltersInput, fallback = 7) {
  const parsed = Number(input.days);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

export function toAdminWebOperationRowDto(item: OperationServiceItem): AdminWebOperationRowDto {
  const actionability = ((item.actionability as OperationActionabilityInput | undefined) ||
    {}) as OperationActionabilityInput;
  return {
    id: String(item.id || ""),
    shopDomain: item.shopDomain ? String(item.shopDomain) : null,
    storeName: item.storeName ? String(item.storeName) : null,
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
    actionability: {
      sync: toActionState(actionability.sync || {}),
      retryInvoice: toActionState(actionability.retryInvoice || {}),
      payment: toActionState(actionability.payment || {}),
      cancel: toActionState(actionability.cancel || {}),
      editEinvoice: toActionState(actionability.editEinvoice || {}),
      pdf: {
        ...toActionState(actionability.pdf || {}),
        invoiceId:
          actionability.pdf && actionability.pdf.invoiceId != null ? String(actionability.pdf.invoiceId) : null,
      },
    },
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
