import type { AdminWebDashboardHighlightRowDto, AdminWebDashboardOverviewDto } from "../../shared/src/admin-web";

type DashboardSettingsInput = {
  companyName?: unknown;
  moduleCount?: unknown;
  activeConnections?: unknown;
  pendingActions?: unknown;
};

type DashboardProductInput = {
  id?: unknown;
  name?: unknown;
  reference?: unknown;
  inventory_quantity?: unknown;
  inventoryQuantity?: unknown;
  sync_status?: unknown;
};

type DashboardOrderInput = {
  shopify_order_id?: unknown;
  id?: unknown;
  shopify_order_number?: unknown;
  orderNumber?: unknown;
  customer_name?: unknown;
  customer?: unknown;
  alegra_status?: unknown;
  alegraStatus?: unknown;
};

type DashboardLogInput = {
  id?: unknown;
  entity?: unknown;
  message?: unknown;
  status?: unknown;
};

type DashboardAggregateInput = {
  settings: DashboardSettingsInput;
  products: { total?: unknown; items: DashboardProductInput[] };
  orders: { total?: unknown; items: DashboardOrderInput[] };
  logs: { items: DashboardLogInput[] };
};

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toStringValue(value: unknown, fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function buildProductHighlights(items: DashboardProductInput[]): AdminWebDashboardHighlightRowDto[] {
  return items.slice(0, 2).map((item, index) => ({
    id: `product:${toStringValue(item.id, String(index))}`,
    kind: "product",
    label: toStringValue(item.reference, "Sin referencia"),
    detail: toStringValue(item.name, "Producto sin nombre"),
    status: toStringValue(item.sync_status, "pending"),
    metric: `${toNumber(item.inventory_quantity ?? item.inventoryQuantity)} uds`,
  }));
}

function buildOrderHighlights(items: DashboardOrderInput[]): AdminWebDashboardHighlightRowDto[] {
  return items.slice(0, 2).map((item, index) => ({
    id: `order:${toStringValue(item.shopify_order_id ?? item.id, String(index))}`,
    kind: "order",
    label: toStringValue(item.shopify_order_number ?? item.orderNumber, "Pedido"),
    detail: toStringValue(item.customer_name ?? item.customer, "Cliente sin nombre"),
    status: toStringValue(item.alegra_status ?? item.alegraStatus, "pendiente"),
    metric: "Sync",
  }));
}

function buildLogHighlights(items: DashboardLogInput[]): AdminWebDashboardHighlightRowDto[] {
  return items
    .filter((item) => ["fail", "retrying", "warn"].includes(toStringValue(item.status)))
    .slice(0, 2)
    .map((item, index) => ({
      id: `log:${toStringValue(item.id, String(index))}`,
      kind: "log",
      label: toStringValue(item.entity, "sync"),
      detail: toStringValue(item.message, "Revisar log operativo"),
      status: toStringValue(item.status, "warn"),
      metric: "Log",
    }));
}

export function toAdminWebDashboardOverviewDto(input: DashboardAggregateInput): AdminWebDashboardOverviewDto {
  const highlights = [
    ...buildProductHighlights(input.products.items || []),
    ...buildOrderHighlights(input.orders.items || []),
    ...buildLogHighlights(input.logs.items || []),
  ].slice(0, 6);

  return {
    companyName: toStringValue(input.settings.companyName, "ApiFlujos"),
    moduleCount: toNumber(input.settings.moduleCount),
    activeConnections: toNumber(input.settings.activeConnections),
    pendingActions: toNumber(input.settings.pendingActions),
    totalProducts: toNumber(input.products.total),
    totalOrders: toNumber(input.orders.total),
    failedLogs: (input.logs.items || []).filter((item) => toStringValue(item.status) === "fail").length,
    highlights,
  };
}
