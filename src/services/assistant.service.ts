import { buildSyncContext } from "./sync-context";
import { listSyncLogs, retryFailedLogs } from "./logs.service";
import { getAlegraCredential, getAiCredential, getSettings, saveSettings } from "./settings.service";
import { getAlegraBaseUrl } from "../utils/alegra-env";
import { getMappingByAlegraId } from "./mapping.service";
import { syncAlegraItemToShopify } from "./alegra-to-shopify.service";
import { getOrgId, getPool } from "../db";
import { ASSISTANT_MASTER_PROMPT } from "./assistant-prompt";
import { listOperations, listOperationsRange } from "./operations.service";

type AssistantAction = {
  type:
    | "publish_item"
    | "hide_item"
    | "sync_products"
    | "sync_orders"
    | "retry_failed_logs"
    | "get_sales_summary"
    | "get_orders_summary"
    | "get_orders_list"
    | "get_products_search"
    | "get_logs"
    | "get_overview"
    | "get_orders_report"
    | "get_products_report"
    | "get_inventory_report"
    | "get_operations_report"
    | "get_settings"
    | "update_invoice_settings"
    | "update_rules";
  payload?: Record<string, unknown>;
  label?: string;
  clientAction?: boolean;
};

type AssistantQueryResult = {
  reply: string;
  actions?: AssistantAction[];
  items?: Array<Record<string, unknown>>;
  itemsHeaders?: string[];
  itemsRows?: string[][];
  report?: Record<string, unknown>;
  clientAction?: AssistantAction;
};

type LogAnalysis = {
  total: number;
  success: number;
  failed: number;
  failRate: number;
  topMessages: Array<{ message: string; total: number }>;
  recentHour: number;
  comparison: null | { previousTotal: number; previousFrom: string; previousTo: string };
};

const HELP_TEXT = [
  "Comandos disponibles:",
  "- buscar producto <texto|SKU|ID>",
  "- publicar item <id>",
  "- ocultar item <id>",
  "- sync productos",
  "- sync pedidos",
  "- reporte db",
  "- prompt maestro",
].join("\n");

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const ACTION_TYPES = new Set<AssistantAction["type"]>([
  "publish_item",
  "hide_item",
  "sync_products",
  "sync_orders",
  "retry_failed_logs",
  "get_sales_summary",
  "get_orders_summary",
  "get_orders_list",
  "get_products_search",
  "get_logs",
  "get_overview",
  "get_orders_report",
  "get_products_report",
  "get_inventory_report",
  "get_operations_report",
  "get_settings",
  "update_invoice_settings",
  "update_rules",
]);
const WRITE_ACTIONS = new Set<AssistantAction["type"]>([
  "publish_item",
  "hide_item",
  "sync_products",
  "sync_orders",
  "retry_failed_logs",
  "update_invoice_settings",
  "update_rules",
]);

let lastLogFilters: {
  status?: string;
  orderId?: string;
  from?: string;
  to?: string;
  entity?: string;
  direction?: string;
} | null = null;

export async function handleAssistantQuery(
  message: string,
  mode = "command",
  intro = false,
  attachments: Array<{ name?: string; type?: string; size?: number }> = [],
  role: "admin" | "agent" = "admin"
) {
  const cleaned = String(message || "").trim();
  if (!cleaned) {
    return { reply: "Necesito una instruccion para continuar." };
  }
  const introPrefix = intro
    ? "Hola, soy Olivia IA. Puedo ayudarte con productos, pedidos, sincronizaciones y reportes. "
    : "";
  const withIntro = (text: string) => (introPrefix ? `${introPrefix}${text}` : text);

  if (attachments.length) {
    const names = attachments.map((file) => file.name || "archivo").join(", ");
    return {
      reply: withIntro(
        `Recibi ${attachments.length} archivo(s): ${names}. Indica que deseas analizar.`
      ),
    };
  }
  const aiResult = await handleAssistantWithAi(cleaned, withIntro, role);
  return aiResult || { reply: withIntro("No pude interpretar la solicitud. Prueba con 'ayuda'.") };
}

export async function executeAssistantAction(action: AssistantAction) {
  if (!action?.type) {
    return { reply: "Accion invalida." };
  }
  if (WRITE_ACTIONS.has(action.type) && action.payload?.confirmed !== true) {
    return { reply: "Necesito confirmacion para ejecutar esa accion." };
  }
  if (action.type === "publish_item" || action.type === "hide_item") {
    const alegraId = String(action.payload?.alegraId || "");
    const sku = String(action.payload?.sku || "");
    if (!alegraId && !sku) {
      return { reply: "Falta el ID de Alegra o el SKU para continuar." };
    }
    const result = sku
      ? await publishOrHideSku(sku, action.type === "publish_item")
      : await publishOrHideItem(alegraId, action.type === "publish_item");
    return {
      reply: result.ok
        ? sku
          ? `SKU ${sku} actualizado en Shopify.`
          : `Item ${alegraId} actualizado en Shopify.`
        : sku
          ? `No se pudo actualizar el SKU ${sku}.`
          : `No se pudo actualizar el item ${alegraId}.`,
      report: result,
    };
  }
  if (action.type === "retry_failed_logs") {
    const result = await retryFailedLogs();
    return { reply: `Listo. Reintente ${result?.retried || 0} log(s).`, report: result || {} };
  }
  if (action.type === "get_sales_summary") {
    const range = resolveDateRange(action.payload || {});
    const summary = await getSalesSummary(range, action.payload || {});
    return {
      reply: `Ventas ${summary.label}: ${summary.totalFormatted} · Pedidos: ${summary.count}`,
      report: summary,
    };
  }
  if (action.type === "get_orders_summary") {
    const range = resolveDateRange(action.payload || {});
    const summary = await getOrdersSummary(range);
    return {
      reply: `Pedidos ${summary.label}: ${summary.count}`,
      report: summary,
    };
  }
  if (action.type === "get_orders_list") {
    const days = Number(action.payload?.days || 30);
    const limit = Number(action.payload?.limit || 50);
    const orders = await listOperations(days);
    const items = orders.items.slice(0, Math.max(1, Math.min(limit, orders.items.length)));
    return {
      reply: `Encontre ${items.length} pedidos en los ultimos ${days} dias.`,
      items,
      itemsHeaders: ["Pedido", "Cliente", "Estado"],
      itemsRows: items.map((order) => [
        String(order.orderNumber || order.id || "-"),
        String(order.customer || "-"),
        String(order.alegraStatus || "-"),
      ]),
    };
  }
  if (action.type === "get_overview") {
    const range = normalizeRange(action.payload?.range);
    const offset = normalizeOffset(action.payload?.offset);
    const report = await buildOverviewReport(range, offset);
    return { reply: formatOverviewReport(report) };
  }
  if (action.type === "get_orders_report") {
    const range = normalizeRange(action.payload?.range);
    const offset = normalizeOffset(action.payload?.offset);
    const report = await buildEntityReport(["order"], "Pedidos", range, offset);
    return { reply: report };
  }
  if (action.type === "get_products_report") {
    const range = normalizeRange(action.payload?.range);
    const offset = normalizeOffset(action.payload?.offset);
    const report = await buildEntityReport(["product", "item"], "Productos", range, offset);
    return { reply: report };
  }
  if (action.type === "get_inventory_report") {
    const range = normalizeRange(action.payload?.range);
    const offset = normalizeOffset(action.payload?.offset);
    const report = await buildEntityReport(["inventory"], "Inventario", range, offset);
    return { reply: report };
  }
  if (action.type === "get_operations_report") {
    const limit = Number(action.payload?.limit || 12);
    const range = normalizeRange(action.payload?.range);
    const offset = normalizeOffset(action.payload?.offset);
    const data = await buildOperationsReport(limit, range, offset);
    return {
      reply: data.reply,
      items: data.items,
      itemsHeaders: data.itemsHeaders,
      itemsRows: data.itemsRows,
    };
  }
  if (action.type === "get_products_search") {
    const query = String(action.payload?.query || "").trim();
    if (!query) {
      return { reply: "Indica el nombre, SKU o ID del producto." };
    }
    const items = await searchAlegraItems(query);
    return {
      reply: items.length
        ? `Encontre ${items.length} productos para "${query}".`
        : `No encontre productos para "${query}".`,
      items,
      itemsHeaders: ["ID", "Nombre", "Referencia"],
      itemsRows: items.map((item) => [
        String(item.id || "-"),
        String(item.name || "-"),
        String(item.reference || item.code || "-"),
      ]),
    };
  }
  if (action.type === "get_logs") {
    const days = Number(action.payload?.days || 7);
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const filters = {
      status: action.payload?.status as string | undefined,
      entity: action.payload?.entity as string | undefined,
      direction: action.payload?.direction as string | undefined,
      from,
    };
    const data = await listSyncLogs(filters);
    return {
      reply: `Logs encontrados: ${data.items.length}`,
      items: data.items,
      itemsHeaders: ["Fecha", "Entidad", "Estado", "Mensaje"],
      itemsRows: data.items.slice(0, 20).map((item) => [
        String(item.created_at || "-"),
        String(item.entity || "-"),
        String(item.status || "-"),
        String(item.message || "-"),
      ]),
      report: data as Record<string, unknown>,
    };
  }
  if (action.type === "get_settings") {
    const settings = await getSettings();
    return {
      reply: formatSettingsSummary(settings),
      report: settings as Record<string, unknown>,
    };
  }
  if (action.type === "update_invoice_settings") {
    await saveSettings({ invoice: action.payload || {} });
    return { reply: "Ajustes de facturacion actualizados." };
  }
  if (action.type === "update_rules") {
    await saveSettings({ rules: action.payload || {} });
    return { reply: "Reglas actualizadas." };
  }
  return { reply: "Esta accion debe ejecutarse desde el cliente." };
}

type EntitySummary = {
  total: number;
  success: number;
  fail: number;
  retrying: number;
  lastAt: string | null;
  topFailures: Array<{ message: string; total: number }>;
  mappingCount: number;
};

type MonthRange = { from: Date; to: Date; label: string };
type RangeKind = "day" | "week" | "month";
type RangePair = { current: MonthRange; previous: MonthRange };

async function buildOverviewReport(range: RangeKind = "month", offset = 0) {
  const { current, previous } = resolveCalendarRanges(range, offset);
  const [orders, products, inventory] = await Promise.all([
    buildEntitySummaryRange(["order"], current.from, current.to),
    buildEntitySummaryRange(["product", "item"], current.from, current.to),
    buildEntitySummaryRange(["inventory"], current.from, current.to),
  ]);
  const [ordersPrev, productsPrev, inventoryPrev] = await Promise.all([
    buildEntitySummaryRange(["order"], previous.from, previous.to),
    buildEntitySummaryRange(["product", "item"], previous.from, previous.to),
    buildEntitySummaryRange(["inventory"], previous.from, previous.to),
  ]);
  return {
    current,
    previous,
    orders,
    products,
    inventory,
    ordersPrev,
    productsPrev,
    inventoryPrev,
  };
}

function formatOverviewReport(report: {
  current: MonthRange;
  previous: MonthRange;
  orders: EntitySummary;
  products: EntitySummary;
  inventory: EntitySummary;
  ordersPrev: EntitySummary;
  productsPrev: EntitySummary;
  inventoryPrev: EntitySummary;
}) {
  const parts = [
    `Resumen general (${report.current.label}).`,
    `Pedidos: ${report.orders.total} eventos · ok ${report.orders.success} · fallos ${report.orders.fail}. ${formatMonthComparison(
      report.orders,
      report.ordersPrev,
      report.previous.label
    )}`,
    `Productos: ${report.products.total} eventos · ok ${report.products.success} · fallos ${report.products.fail}. ${formatMonthComparison(
      report.products,
      report.productsPrev,
      report.previous.label
    )}`,
    `Inventario: ${report.inventory.total} eventos · ok ${report.inventory.success} · fallos ${report.inventory.fail}. ${formatMonthComparison(
      report.inventory,
      report.inventoryPrev,
      report.previous.label
    )}`,
  ];
  return parts.join(" ");
}

async function buildEntityReport(
  entities: string[],
  label: string,
  range: RangeKind = "month",
  offset = 0
) {
  const { current, previous } = resolveCalendarRanges(range, offset);
  const summary = await buildEntitySummaryRange(entities, current.from, current.to);
  const prev = await buildEntitySummaryRange(entities, previous.from, previous.to);
  return formatEntitySummary(label, summary, current, previous, prev);
}

async function buildEntitySummaryRange(
  entities: string[],
  from: Date,
  to: Date
): Promise<EntitySummary> {
  const pool = getPool();
  const orgId = getOrgId();
  const since = from.toISOString();
  const until = to.toISOString();
  const totals = await pool.query<{
    total: string;
    last_at: string | null;
  }>(
    `
    SELECT COUNT(*) AS total, MAX(created_at) AS last_at
    FROM sync_logs
    WHERE organization_id = $1
      AND entity = ANY($2::text[])
      AND created_at >= $3
      AND created_at <= $4
    `,
    [orgId, entities, since, until]
  );
  const statusCounts = await pool.query<{ status: string; total: string }>(
    `
    SELECT status, COUNT(*) AS total
    FROM sync_logs
    WHERE organization_id = $1
      AND entity = ANY($2::text[])
      AND created_at >= $3
      AND created_at <= $4
    GROUP BY status
    `,
    [orgId, entities, since, until]
  );
  const failures = await pool.query<{ message: string | null; total: string }>(
    `
    SELECT message, COUNT(*) AS total
    FROM sync_logs
    WHERE organization_id = $1
      AND entity = ANY($2::text[])
      AND created_at >= $3
      AND created_at <= $4
      AND status = 'fail'
      AND message IS NOT NULL
    GROUP BY message
    ORDER BY total DESC
    LIMIT 3
    `,
    [orgId, entities, since, until]
  );
  const mappings = await pool.query<{ total: string }>(
    `
    SELECT COUNT(*) AS total
    FROM sync_mappings
    WHERE organization_id = $1
      AND entity = ANY($2::text[])
    `,
    [orgId, entities]
  );
  const totalsRow = totals.rows[0] || { total: "0", last_at: null };
  const statusMap = new Map(statusCounts.rows.map((row) => [row.status, Number(row.total || 0)]));
  return {
    total: Number(totalsRow.total || 0),
    success: statusMap.get("success") || 0,
    fail: statusMap.get("fail") || 0,
    retrying: statusMap.get("retrying") || 0,
    lastAt: totalsRow.last_at || null,
    topFailures: failures.rows.map((row) => ({
      message: String(row.message || ""),
      total: Number(row.total || 0),
    })),
    mappingCount: Number(mappings.rows[0]?.total || 0),
  };
}

function formatEntitySummary(
  label: string,
  summary: EntitySummary,
  current: MonthRange,
  previous: MonthRange,
  previousSummary?: EntitySummary
) {
  const last = summary.lastAt ? new Date(summary.lastAt).toLocaleString("es-CO") : "sin datos";
  const parts = [
    `${label} (${current.label}): ${summary.total} eventos · ok ${summary.success} · fallos ${summary.fail}` +
      (summary.retrying ? ` · reintentos ${summary.retrying}` : ""),
    `Ultimo registro: ${last}`,
  ];
  if (previousSummary) {
    parts.push(formatMonthComparison(summary, previousSummary, previous.label));
  }
  if (summary.mappingCount) {
    parts.push(`Registros mapeados: ${summary.mappingCount}`);
  }
  if (summary.topFailures.length) {
    const failures = summary.topFailures
      .map((item) => `${item.message} (${item.total})`)
      .join("; ");
    parts.push(`Errores frecuentes: ${failures}`);
  }
  return parts.join(". ");
}

async function buildOperationsReport(limit: number, range: RangeKind = "month", offset = 0) {
  const { current, previous } = resolveCalendarRanges(range, offset);
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 50) : 12;
  const operations = await listOperationsRange(current.from, current.to);
  const operationsPrev = await listOperationsRange(previous.from, previous.to);
  const items = operations.items.slice(0, safeLimit);
  const total = operations.items.length;
  const counts = operations.items.reduce(
    (acc, item) => {
      const status = String(item.alegraStatus || "pendiente");
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const parts = [
    `Operaciones (${current.label}): ${total} pedidos`,
    `Facturados ${counts.facturado || 0} · pendientes ${counts.pendiente || 0} · fallos ${counts.fallo || 0}`,
    formatSimpleComparison(total, operationsPrev.items.length, previous.label),
  ];
  return {
    reply: parts.join(". "),
    items,
    itemsHeaders: ["Pedido", "Cliente", "Estado"],
    itemsRows: items.map((order) => [
      String(order.orderNumber || order.id || "-"),
      String(order.customer || "-"),
      String(order.alegraStatus || "-"),
    ]),
  };
}

function resolveCalendarRanges(range: RangeKind, offset = 0): RangePair {
  if (range === "day") {
    return resolveCalendarDayRanges(offset);
  }
  if (range === "week") {
    return resolveCalendarWeekRanges(offset);
  }
  return resolveCalendarMonthRanges(offset);
}

function resolveCalendarMonthRanges(offset = 0): RangePair {
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  const currentFrom = new Date(base.getFullYear(), base.getMonth(), 1);
  const currentTo = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59, 999);
  const previousFrom = new Date(base.getFullYear(), base.getMonth() - 1, 1);
  const previousTo = new Date(base.getFullYear(), base.getMonth(), 0, 23, 59, 59, 999);
  return {
    current: {
      from: currentFrom,
      to: currentTo,
      label: formatMonthLabel(currentFrom),
    },
    previous: {
      from: previousFrom,
      to: previousTo,
      label: formatMonthLabel(previousFrom),
    },
  };
}

function resolveCalendarWeekRanges(offset = 0): RangePair {
  const now = new Date();
  const base = new Date(now);
  base.setDate(base.getDate() - offset * 7);
  const currentFrom = startOfWeek(base);
  const currentTo = endOfWeek(base);
  const previousFrom = new Date(currentFrom);
  previousFrom.setDate(previousFrom.getDate() - 7);
  const previousTo = new Date(currentTo);
  previousTo.setDate(previousTo.getDate() - 7);
  return {
    current: {
      from: currentFrom,
      to: currentTo,
      label: formatWeekLabel(currentFrom),
    },
    previous: {
      from: previousFrom,
      to: previousTo,
      label: formatWeekLabel(previousFrom),
    },
  };
}

function resolveCalendarDayRanges(offset = 0): RangePair {
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
  const currentFrom = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const currentTo = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 23, 59, 59, 999);
  const previousFrom = new Date(currentFrom);
  previousFrom.setDate(previousFrom.getDate() - 1);
  const previousTo = new Date(currentTo);
  previousTo.setDate(previousTo.getDate() - 1);
  return {
    current: {
      from: currentFrom,
      to: currentTo,
      label: formatDayLabel(currentFrom),
    },
    previous: {
      from: previousFrom,
      to: previousTo,
      label: formatDayLabel(previousFrom),
    },
  };
}

function formatMonthLabel(date: Date) {
  const month = date.toLocaleString("es-CO", { month: "long" });
  return `${month} ${date.getFullYear()}`;
}

function formatWeekLabel(date: Date) {
  const start = startOfWeek(date);
  const end = endOfWeek(date);
  const startLabel = `${start.getDate()} ${start.toLocaleString("es-CO", { month: "short" })}`;
  const endLabel = `${end.getDate()} ${end.toLocaleString("es-CO", { month: "short" })}`;
  return `semana ${startLabel} - ${endLabel}`;
}

function formatDayLabel(date: Date) {
  const day = date.getDate();
  const month = date.toLocaleString("es-CO", { month: "long" });
  return `${day} ${month} ${date.getFullYear()}`;
}

function startOfWeek(date: Date) {
  const day = date.getDay();
  const diff = (day + 6) % 7;
  const start = new Date(date);
  start.setDate(date.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function endOfWeek(date: Date) {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function formatMonthComparison(current: EntitySummary, previous: EntitySummary, previousLabel: string) {
  const totalDelta = formatDelta(current.total, previous.total);
  const failDelta = formatDelta(current.fail, previous.fail);
  const successDelta = formatDelta(current.success, previous.success);
  return `Vs ${previousLabel}: total ${totalDelta} · ok ${successDelta} · fallos ${failDelta}`;
}

function formatSimpleComparison(current: number, previous: number, previousLabel: string) {
  return `Vs ${previousLabel}: ${formatDelta(current, previous)}`;
}

function formatDelta(current: number, previous: number) {
  const diff = current - previous;
  const sign = diff > 0 ? "+" : diff < 0 ? "-" : "";
  if (previous === 0) {
    return `${sign}${Math.abs(diff)} (${previous === 0 && current > 0 ? "nuevo" : "sin cambio"})`;
  }
  const pct = Math.round((Math.abs(diff) / previous) * 100);
  return `${sign}${Math.abs(diff)} (${sign || ""}${pct}%)`;
}

async function publishOrHideItem(alegraId: string, publish: boolean) {
  const ctx = await buildSyncContext();
  await syncAlegraItemToShopify(alegraId);
  const mapping = await getMappingByAlegraId("item", alegraId);
  if (!mapping?.shopifyProductId) {
    return { ok: false, reason: "missing_shopify_product" };
  }
  await ctx.shopify.updateProductStatus(mapping.shopifyProductId, publish);
  return { ok: true, shopifyProductId: mapping.shopifyProductId, publish };
}

async function publishOrHideSku(sku: string, publish: boolean) {
  const ctx = await buildSyncContext();
  const lookup = await ctx.shopify.findVariantByIdentifier(sku);
  const variant = lookup.productVariants?.edges?.[0]?.node;
  const productId = variant?.product?.id;
  if (!productId) {
    return { ok: false, reason: "sku_not_found" };
  }
  await ctx.shopify.updateProductStatus(productId, publish);
  return { ok: true, shopifyProductId: productId, publish, sku };
}

async function searchAlegraItems(query: string) {
  const credential = await getAlegraCredential();
  const baseUrl = getAlegraBaseUrl(credential.environment || "prod");
  const auth = Buffer.from(`${credential.email}:${credential.apiKey}`).toString("base64");
  const url = `${baseUrl}/items?limit=100&start=0&mode=advanced&fields=id,name,reference,code,barcode`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Alegra HTTP ${response.status}`);
  }
  const payload = (await response.json()) as { items?: Array<Record<string, unknown>>; data?: Array<Record<string, unknown>> };
  const items = Array.isArray(payload.items)
    ? payload.items
    : Array.isArray(payload.data)
      ? payload.data
      : [];
  const normalized = query.toLowerCase();
  return items
    .filter((item) => {
      const name = String(item.name || "").toLowerCase();
      const reference = String(item.reference || "").toLowerCase();
      const code = String(item.code || "").toLowerCase();
      const barcode = String(item.barcode || "").toLowerCase();
      return (
        name.includes(normalized) ||
        reference.includes(normalized) ||
        code.includes(normalized) ||
        barcode.includes(normalized) ||
        String(item.id || "").includes(normalized)
      );
    })
    .slice(0, 10);
}

function looksLikeLogRequest(normalized: string) {
  return (
    normalized.includes("log") ||
    normalized.includes("logs") ||
    normalized.includes("errores") ||
    normalized.includes("error") ||
    normalized.includes("fallo") ||
    normalized.includes("fallas") ||
    normalized.includes("webhook") ||
    normalized.includes("exitos") ||
    normalized.includes("exito") ||
    normalized.includes("exitosos")
  );
}

function parseLogQuery(cleaned: string, normalized: string) {
  const filters: {
    status?: string;
    orderId?: string;
    from?: string;
    to?: string;
    entity?: string;
    direction?: string;
  } = {};
  if (normalized.includes("mismos filtros") || normalized.includes("igual que antes") || normalized.includes("repetir filtro")) {
    if (lastLogFilters) {
      return { filters: lastLogFilters };
    }
  }
  const entity = resolveEntityFilter(normalized);
  const direction = resolveDirectionFilter(normalized);
  if (entity) {
    filters.entity = entity;
  }
  if (direction) {
    filters.direction = direction;
  }
  if (normalized.includes("exitoso") || normalized.includes("exitosos") || normalized.includes("exito") || normalized.includes("exitosa")) {
    filters.status = "success";
  } else if (
    normalized.includes("error") ||
    normalized.includes("errores") ||
    normalized.includes("fallo") ||
    normalized.includes("fallas")
  ) {
    filters.status = "fail";
  }
  const orderMatch = cleaned.match(/#(\d+)/);
  if (orderMatch) {
    filters.orderId = orderMatch[1];
  }

  const now = new Date();
  const lower = normalized;
  if (lower.includes("hoy")) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    filters.from = start.toISOString();
  } else if (lower.includes("ayer")) {
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    filters.from = start.toISOString();
    filters.to = end.toISOString();
  } else if (lower.match(/24\s?h/)) {
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    filters.from = start.toISOString();
  } else if (lower.match(/7\s?d/) || lower.includes("7 dias") || lower.includes("ultima semana")) {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    filters.from = start.toISOString();
  } else if (lower.match(/30\s?d/) || lower.includes("30 dias") || lower.includes("ultimo mes")) {
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    filters.from = start.toISOString();
  }

  if (!filters.from && !filters.orderId) {
    return {
      filters,
      ask: "Quieres ver logs de hoy, 24h, 7 dias, 30 dias o por pedido (ej: #1234)?",
    };
  }
  return { filters };
}

function resolveEntityFilter(normalized: string) {
  if (normalized.includes("pedido") || normalized.includes("orden") || normalized.includes("factura")) {
    return "order";
  }
  if (normalized.includes("inventario") || normalized.includes("stock")) {
    return "inventory";
  }
  if (normalized.includes("producto") || normalized.includes("productos") || normalized.includes("item")) {
    return "product";
  }
  if (normalized.includes("webhook") || normalized.includes("webhooks")) {
    return "webhook";
  }
  return undefined;
}

function resolveDirectionFilter(normalized: string) {
  const mentionsShopify = normalized.includes("shopify");
  const mentionsAlegra = normalized.includes("alegra");
  if (mentionsShopify && !mentionsAlegra) {
    return "shopify->alegra";
  }
  if (mentionsAlegra && !mentionsShopify) {
    return "alegra->shopify";
  }
  return undefined;
}

function hasAny(normalized: string, terms: string[]) {
  return terms.some((term) => normalized.includes(term));
}

function isOrderSearchIntent(normalized: string) {
  if (hasAny(normalized, ["ultimo pedido", "último pedido", "ultima orden", "última orden"])) {
    return false;
  }
  return (
    normalized.includes("pedido") &&
    (hasAny(normalized, ["buscar", "ver", "estado", "consultar"]) || normalized.includes("#"))
  );
}

function isProductSearchIntent(normalized: string) {
  if (hasAny(normalized, ["ultimo producto", "último producto", "ultimo item", "último item"])) {
    return false;
  }
  return normalized.includes("producto") && hasAny(normalized, ["buscar", "ver", "consultar", "encontrar"]);
}

function isPublishIntent(normalized: string) {
  return hasAny(normalized, ["publicar", "publica", "activar", "activar producto", "activar item"]);
}

function isHideIntent(normalized: string) {
  return hasAny(normalized, ["ocultar", "oculta", "despublicar", "despublica", "desactivar"]);
}

function isSyncProductsIntent(normalized: string) {
  return hasAny(normalized, [
    "sync productos",
    "sincroniza productos",
    "sincronizar productos",
    "sincronizacion productos",
    "sincronización productos",
  ]);
}

function isSyncOrdersIntent(normalized: string) {
  return hasAny(normalized, [
    "sync pedidos",
    "sincroniza pedidos",
    "sincronizar pedidos",
    "sincronizacion pedidos",
    "sincronización pedidos",
    "sincroniza ordenes",
    "sincronizar ordenes",
    "sincronizar órdenes",
    "sincronizacion ordenes",
    "sincronización ordenes",
  ]);
}

function extractOrderNumber(input: string) {
  const match = input.match(/#(\d+)/);
  if (match) return match[1];
  const digits = input.match(/\b\d{3,}\b/);
  return digits ? digits[0] : "";
}

function extractProductQuery(input: string) {
  return input
    .replace(/buscar/i, "")
    .replace(/producto(s)?/i, "")
    .trim();
}

function buildClarifyingQuestion(cleaned: string, normalized: string) {
  if (!cleaned || cleaned.length < 3) {
    return "Puedo ayudarte si me dices el tema: pedidos, productos, logs o sincronizacion.";
  }
  if (normalized.includes("config") || normalized.includes("token")) {
    return "Estas revisando configuracion o tokens? Dime que deseas cambiar.";
  }
  if (normalized.includes("pedido")) {
    return "Quieres buscar un pedido, ver el ultimo sincronizado o revisar errores?";
  }
  if (normalized.includes("producto") || normalized.includes("item")) {
    return "Quieres buscar un producto, ver el ultimo sincronizado o publicar/ocultar?";
  }
  if (normalized.includes("log") || normalized.includes("error") || normalized.includes("fall")) {
    return "Quieres ver logs de hoy, 24h, 7 dias, 30 dias o por pedido?";
  }
  if (normalized.includes("sincron")) {
    return "Quieres sincronizar pedidos o productos?";
  }
  return "No alcanzo a entender. Dime que necesitas hacer y lo resolvemos juntos.";
}

async function inferIntent(cleaned: string, normalized: string, introPrefix: string) {
  const withIntro = (text: string) => (introPrefix ? `${introPrefix}${text}` : text);

  if (normalized.includes("pedido")) {
    if (normalized.includes("ultimo") || normalized.includes("último")) {
      const latestOrder = await getLatestOrderSync();
      if (!latestOrder) {
        return { reply: withIntro("No encuentro pedidos sincronizados recientemente. Quieres iniciar una sincronizacion?") };
      }
      const when = latestOrder.createdAt
        ? new Date(latestOrder.createdAt).toLocaleString("es-CO")
        : "fecha desconocida";
      return { reply: withIntro(`El ultimo pedido sincronizado es #${latestOrder.orderId} (${when}).`) };
    }
    const orderNumber = extractOrderNumber(cleaned);
    if (orderNumber) {
      const orders = await searchShopifyOrders(orderNumber);
      return {
        reply: withIntro(
          orders.length
            ? `Encontre ${orders.length} pedidos para #${orderNumber}.`
            : `No encontre pedidos para #${orderNumber}.`
        ),
        items: orders,
        itemsHeaders: ["Pedido", "Cliente", "Estado"],
        itemsRows: orders.map((order) => [
          String(order.orderNumber || order.name || "-"),
          String(order.customer || "-"),
          String(order.status || "-"),
        ]),
      };
    }
    return { reply: withIntro("Quieres el ultimo pedido sincronizado o buscar un pedido por numero?") };
  }

  if (normalized.includes("producto") || normalized.includes("item")) {
    if (normalized.includes("ultimo") || normalized.includes("último")) {
      const latest = await getLatestProductSync();
      if (!latest) {
        return { reply: withIntro("No encuentro productos sincronizados recientemente. Quieres iniciar una sincronizacion?") };
      }
      const detail = latest.name
        ? `${latest.name}${latest.reference ? ` · ${latest.reference}` : ""}`
        : latest.alegraItemId
          ? `Item ${latest.alegraItemId}`
          : "Producto sin ID";
      const when = latest.createdAt
        ? new Date(latest.createdAt).toLocaleString("es-CO")
        : "fecha desconocida";
      return { reply: withIntro(`El ultimo producto sincronizado es: ${detail} (${when}).`) };
    }
    const query = extractProductQuery(cleaned);
    if (query) {
      const items = await searchAlegraItems(query);
      return {
        reply: withIntro(
          items.length
            ? `Encontre ${items.length} productos relacionados con "${query}".`
            : `No encontre productos para "${query}".`
        ),
        items,
        itemsHeaders: ["ID", "Nombre", "Referencia"],
        itemsRows: items.map((item) => [
          String(item.id || "-"),
          String(item.name || "-"),
          String(item.reference || item.code || "-"),
        ]),
      };
    }
    return { reply: withIntro("Quieres el ultimo producto sincronizado o buscar uno por nombre/SKU?") };
  }

  if (normalized.includes("sincron")) {
    if (normalized.includes("pedido")) {
      return {
        reply: withIntro("Puedo iniciar la sincronizacion de pedidos. Confirmas que la ejecute ahora?"),
      };
    }
    if (normalized.includes("producto")) {
      return {
        reply: withIntro("Puedo iniciar la sincronizacion de productos. Confirmas que la ejecute ahora?"),
      };
    }
    return { reply: withIntro("Quieres sincronizar pedidos o productos?") };
  }

  if (normalized.includes("public")) {
    return { reply: withIntro("Quieres publicar por ID de Alegra o por SKU?") };
  }

  if (normalized.includes("ocult") || normalized.includes("despublic")) {
    return { reply: withIntro("Quieres ocultar por ID de Alegra o por SKU?") };
  }

  if (looksLikeLogRequest(normalized)) {
    return { reply: withIntro("Quieres ver logs de hoy, 24h, 7 dias, 30 dias o por pedido (ej: #1234)?") };
  }

  const aiResult = await handleAssistantWithAi(cleaned, withIntro);
  return aiResult || { reply: withIntro("No pude interpretar la solicitud. Prueba con 'ayuda'.") };
}

async function handleAssistantWithAi(
  message: string,
  withIntro: (text: string) => string,
  role: "admin" | "agent" = "admin"
): Promise<AssistantQueryResult | null> {
  let aiKey: string;
  try {
    const credential = await getAiCredential();
    aiKey = credential.apiKey;
  } catch {
    return { reply: withIntro("Configura la API key de IA en Ajustes para activar el asistente.") };
  }
  const systemPrompt = [
    ASSISTANT_MASTER_PROMPT,
  ].join("\n");

  const body = {
    model: OPENAI_MODEL,
    temperature: 0.2,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ],
  };
  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${aiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    return { reply: withIntro(text || "No pude responder en este momento.") };
  }
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content || "";
  const extracted = extractActionTag(content);
  let replyText = extracted.text || "";
  let action = extracted.action as AssistantAction | undefined;
  let parsed: Record<string, unknown> | null = null;
  if (!action) {
    parsed = parseAiJson(content);
    if (parsed) {
      replyText = typeof parsed.reply === "string" ? parsed.reply : replyText;
      action = parsed.action as AssistantAction | undefined;
    }
  }
  if (!parsed && !action && looksLikeRawJson(content)) {
    return { reply: withIntro("No pude interpretar la respuesta. Intenta de nuevo.") };
  }
  const reply = replyText || "Listo.";
  if (action && ACTION_TYPES.has(action.type)) {
    // Permissions disabled: allow all actions for authenticated users.
    const confirmed = /confirmar|confirmo|confirmada|confirmado/i.test(message);
    if (WRITE_ACTIONS.has(action.type) && !confirmed) {
      return { reply: withIntro("Para ejecutar esa accion necesito confirmacion. Responde con: confirmar.") };
    }
    if (confirmed && action.payload) {
      action.payload.confirmed = true;
    }
    if (action.type === "sync_products" || action.type === "sync_orders") {
      const clientAction: AssistantAction = { ...action, clientAction: true };
      return { reply: withIntro(reply), clientAction };
    }
    const result = await executeAssistantAction(action);
    return {
      reply: withIntro(result.reply || reply),
      items: result.items,
      itemsHeaders: result.itemsHeaders,
      itemsRows: result.itemsRows,
    };
  }
  const inferred = inferReportAction(message);
  if (inferred) {
    const result = await executeAssistantAction(inferred);
    return {
      reply: withIntro(result.reply || reply),
      items: result.items,
      itemsHeaders: result.itemsHeaders,
      itemsRows: result.itemsRows,
    };
  }
  if (looksLikeSalesQuestion(message)) {
    const result = await executeAssistantAction({ type: "get_sales_summary", payload: {} });
    return { reply: withIntro(result.reply) };
  }
  if (looksLikeOrdersQuestion(message)) {
    const result = await executeAssistantAction({ type: "get_orders_summary", payload: {} });
    return { reply: withIntro(result.reply) };
  }
  return { reply: withIntro(reply) };
}

function extractActionTag(content: string) {
  const text = content || "";
  const match = text.match(/\[\[action\s+([^\]]+)\]\]/i);
  if (!match) {
    return { text: text.trim(), action: null };
  }
  const tagBody = match[1] || "";
  const cleaned = text.replace(match[0], "").trim();
  const parts = tagBody.split(/\s+/).filter(Boolean);
  let type = "";
  const payload: Record<string, unknown> = {};
  for (const part of parts) {
    const [rawKey, rawValue] = part.split("=");
    if (!rawKey || typeof rawValue === "undefined") {
      continue;
    }
    const key = rawKey.trim();
    const value = parseActionValue(rawValue.trim());
    if (key === "type" && typeof value === "string") {
      type = value;
      continue;
    }
    payload[key] = value;
  }
  if (!type) {
    return { text: cleaned, action: null };
  }
  return {
    text: cleaned,
    action: {
      type: type as AssistantAction["type"],
      payload: Object.keys(payload).length ? payload : undefined,
    },
  };
}

function parseActionValue(raw: string) {
  const stripped = raw.replace(/^["']|["']$/g, "");
  if (stripped === "true") return true;
  if (stripped === "false") return false;
  if (stripped === "null") return null;
  const num = Number(stripped);
  if (!Number.isNaN(num) && stripped !== "") {
    return num;
  }
  return stripped;
}

function parseAiJson(content: string) {
  if (!content) return null;
  const trimmed = content.trim();
  const direct = tryParseJson(trimmed);
  if (direct) return direct;
  const fenced = trimmed.match(/```json\\s*([\\s\\S]*?)```/i);
  if (fenced && fenced[1]) {
    return tryParseJson(fenced[1].trim());
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return tryParseJson(trimmed.slice(start, end + 1));
  }
  return null;
}

function tryParseJson(text: string) {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function looksLikeRawJson(content: string) {
  const trimmed = String(content || "").trim();
  if (!trimmed) return false;
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function looksLikeSalesQuestion(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("venta") || normalized.includes("factur");
}

function looksLikeOrdersQuestion(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("pedido") || normalized.includes("orden");
}

function normalizeRange(raw: unknown): RangeKind {
  if (raw === "day" || raw === "week" || raw === "month") return raw;
  return "month";
}

function normalizeOffset(raw: unknown) {
  const value = Number(raw || 0);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(Math.floor(value), 12);
}

function inferReportAction(message: string): AssistantAction | null {
  const normalized = message.toLowerCase();
  const wantsReport =
    normalized.includes("resumen") ||
    normalized.includes("reporte") ||
    normalized.includes("reportes") ||
    normalized.includes("informe") ||
    normalized.includes("analisis") ||
    normalized.includes("análisis") ||
    normalized.includes("estado general") ||
    normalized.includes("dashboard");
  if (!wantsReport && !looksLikeOrdersQuestion(message) && !normalized.includes("producto") && !normalized.includes("inventario") && !normalized.includes("operacion")) {
    return null;
  }
  const inferred = inferRangeFromMessage(normalized);
  const range = inferred?.range || null;
  const offset = inferred?.offset;
  if (normalized.includes("operacion") || normalized.includes("operaciones")) {
    return { type: "get_operations_report", payload: buildRangePayload(range, offset) };
  }
  if (normalized.includes("inventario") || normalized.includes("stock")) {
    return { type: "get_inventory_report", payload: buildRangePayload(range, offset) };
  }
  if (normalized.includes("producto") || normalized.includes("productos") || normalized.includes("item")) {
    return { type: "get_products_report", payload: buildRangePayload(range, offset) };
  }
  if (normalized.includes("pedido") || normalized.includes("pedidos") || normalized.includes("orden") || normalized.includes("ordenes") || normalized.includes("órdenes")) {
    return { type: "get_orders_report", payload: buildRangePayload(range, offset) };
  }
  return { type: "get_overview", payload: buildRangePayload(range, offset) };
}

function inferRangeFromMessage(normalized: string): { range: RangeKind; offset: number } | null {
  if (normalized.includes("anteayer")) {
    return { range: "day", offset: 2 };
  }
  if (normalized.includes("ayer")) {
    return { range: "day", offset: 1 };
  }
  if (normalized.includes("hoy") || normalized.includes("día") || normalized.includes("dia")) {
    return { range: "day", offset: 0 };
  }
  if (normalized.includes("semana pasada") || normalized.includes("semana anterior")) {
    return { range: "week", offset: 1 };
  }
  if (normalized.includes("semana") || normalized.includes("semanal")) {
    return { range: "week", offset: 0 };
  }
  if (normalized.includes("mes pasado") || normalized.includes("mes anterior")) {
    return { range: "month", offset: 1 };
  }
  if (normalized.includes("mes") || normalized.includes("mensual")) {
    return { range: "month", offset: 0 };
  }
  return null;
}

function buildRangePayload(range: RangeKind | null, offset?: number) {
  if (!range && !offset) return undefined;
  const payload: Record<string, unknown> = {};
  if (range) payload.range = range;
  if (offset) payload.offset = offset;
  return payload;
}

function resolveDateRange(payload: Record<string, unknown>) {
  const days = Number(payload.days || 0);
  if (Number.isFinite(days) && days > 0) {
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return { from, to: new Date(), label: `ultimos ${days} dias` };
  }
  const month = Number(payload.month || 0);
  const year = Number(payload.year || new Date().getFullYear());
  if (month >= 1 && month <= 12) {
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0, 23, 59, 59, 999);
    return { from, to, label: `mes ${month}/${year}` };
  }
  const current = new Date();
  const from = new Date(current.getFullYear(), current.getMonth(), 1);
  return { from, to: new Date(), label: "mes actual" };
}

async function getSalesSummary(
  range: { from: Date; to: Date; label: string },
  payload: Record<string, unknown> = {}
) {
  const ctx = await buildSyncContext();
  const methodFilter = String(payload.paymentMethod || "").trim().toLowerCase();
  if (methodFilter) {
    const payments = await listAlegraPaymentsInRange(ctx, range);
    const filtered = payments.filter((payment) => {
      const method = resolvePaymentMethodLabel(payment).toLowerCase();
      return method.includes(methodFilter);
    });
    const total = filtered.reduce((acc, payment) => {
      const amount = Number(payment.amount || payment.total || 0);
      return acc + (Number.isFinite(amount) ? amount : 0);
    }, 0);
    return {
      label: `${range.label} (${methodFilter})`,
      count: filtered.length,
      total,
      totalFormatted: new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
      }).format(total),
    };
  }
  const invoices = await listAlegraInvoicesInRange(ctx, range);
  const total = invoices.reduce((acc, invoice) => {
    const amount = Number(
      invoice.total ||
        invoice.totalTaxed ||
        invoice.subtotal ||
        invoice.amount ||
        0
    );
    return acc + (Number.isFinite(amount) ? amount : 0);
  }, 0);
  return {
    label: range.label,
    count: invoices.length,
    total,
    totalFormatted: new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
    }).format(total),
  };
}

function formatSettingsSummary(settings: Awaited<ReturnType<typeof getSettings>>) {
  const parts: string[] = [];
  if (settings.shopify) {
    const token = settings.shopify.hasAccessToken ? "token activo" : "sin token";
    parts.push(
      `Shopify: ${settings.shopify.shopDomain || "-"} · ${token} · api ${settings.shopify.apiVersion || "-"}`
    );
  } else {
    parts.push("Shopify: no configurado.");
  }
  if (settings.alegra) {
    const token = settings.alegra.hasApiKey ? "token activo" : "sin token";
    parts.push(
      `Alegra: ${settings.alegra.email || "-"} · ${token} · entorno ${settings.alegra.environment || "prod"}`
    );
  } else {
    parts.push("Alegra: no configurado.");
  }
  if (settings.ai) {
    parts.push(`IA: ${settings.ai.hasApiKey ? "token activo" : "sin token"}.`);
  } else {
    parts.push("IA: no configurado.");
  }
  if (settings.rules) {
    const rules = settings.rules;
    const autoStatus = rules.autoPublishStatus || "draft";
    parts.push(
      `Reglas: publicar por stock ${rules.publishOnStock ? "si" : "no"} · webhook auto ${rules.autoPublishOnWebhook ? "si" : "no"} · estado auto ${autoStatus}`
    );
    parts.push(
      `Inventario: ajustes ${rules.inventoryAdjustmentsEnabled ? "si" : "no"} · intervalo ${rules.inventoryAdjustmentsIntervalMinutes || 0} min · auto publicar ${rules.inventoryAdjustmentsAutoPublish ? "si" : "no"}`
    );
  }
  if (settings.invoice) {
    const invoice = settings.invoice;
    parts.push(
      `Facturacion: generar ${invoice.generateInvoice ? "si" : "no"} · e-invoice ${invoice.einvoiceEnabled ? "si" : "no"} · metodo ${invoice.paymentMethod || "-"}`
    );
  }
  return parts.join(". ");
}

async function getOrdersSummary(range: { from: Date; to: Date; label: string }) {
  const ctx = await buildSyncContext();
  const fromIso = range.from.toISOString().slice(0, 10);
  const toIso = range.to.toISOString().slice(0, 10);
  const query = `status:any created_at:>='${fromIso}' created_at:<='${toIso}'`;
  const orders = await ctx.shopify.listAllOrdersByQuery(query);
  return {
    label: range.label,
    count: orders.length,
  };
}

async function listAlegraInvoicesInRange(
  ctx: Awaited<ReturnType<typeof buildSyncContext>>,
  range: { from: Date; to: Date }
) {
  const pageSize = 30;
  const maxPages = Math.max(1, Number(process.env.METRICS_MAX_PAGES || 10));
  const invoices: Array<Record<string, unknown>> = [];
  for (let page = 0; page < maxPages; page += 1) {
    const batch = (await ctx.alegra.listInvoices({
      limit: pageSize,
      start: page * pageSize,
    })) as Array<Record<string, unknown>>;
    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }
    invoices.push(...batch);
    if (batch.length < pageSize) {
      break;
    }
  }
  return invoices.filter((invoice) => {
    const date =
      String(invoice.date || invoice.datetime || invoice.createdAt || "").slice(0, 10);
    if (!date) return false;
    const invoiceDate = Date.parse(`${date}T00:00:00.000Z`);
    return invoiceDate >= range.from.getTime() && invoiceDate <= range.to.getTime();
  });
}

async function listAlegraPaymentsInRange(
  ctx: Awaited<ReturnType<typeof buildSyncContext>>,
  range: { from: Date; to: Date }
) {
  const pageSize = 30;
  const maxPages = Math.max(1, Number(process.env.METRICS_MAX_PAGES || 10));
  const payments: Array<Record<string, unknown>> = [];
  for (let page = 0; page < maxPages; page += 1) {
    const batch = (await ctx.alegra.listPayments({
      limit: pageSize,
      start: page * pageSize,
    })) as Array<Record<string, unknown>>;
    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }
    payments.push(...batch);
    if (batch.length < pageSize) {
      break;
    }
  }
  return payments.filter((payment) => {
    const date =
      String(payment.date || payment.datetime || payment.createdAt || "").slice(0, 10);
    if (!date) return false;
    const paymentDate = Date.parse(`${date}T00:00:00.000Z`);
    return paymentDate >= range.from.getTime() && paymentDate <= range.to.getTime();
  });
}

function resolvePaymentMethodLabel(payment: Record<string, unknown>) {
  const method = (payment.paymentMethod || payment.method || payment.type) as
    | string
    | { name?: string };
  if (typeof method === "string") return method;
  if (method && typeof method === "object" && "name" in method) {
    return String(method.name || "");
  }
  return "Otro";
}

async function getLatestProductSync() {
  const pool = getPool();
  const orgId = getOrgId();
  const result = await pool.query<{
    entity: string;
    direction: string;
    status: string;
    message: string | null;
    request_json: Record<string, unknown> | null;
    response_json: Record<string, unknown> | null;
    created_at: string;
  }>(
    `
    SELECT entity, direction, status, message, request_json, response_json, created_at
    FROM sync_logs
    WHERE organization_id = $1
      AND entity IN ('product', 'item')
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId]
  );
  if (!result.rows.length) {
    return null;
  }
  const row = result.rows[0];
  const request = row.request_json || {};
  const alegraItemId =
    (request.alegraItemId as string | undefined) ||
    (request.itemId as string | undefined) ||
    (request.alegra_id as string | undefined);
  if (!alegraItemId) {
    return { createdAt: row.created_at };
  }
  try {
    const ctx = await buildSyncContext();
    const item = (await ctx.alegra.getItem(String(alegraItemId))) as {
      name?: string;
      reference?: string;
    };
    return {
      alegraItemId: String(alegraItemId),
      name: item?.name || undefined,
      reference: item?.reference || undefined,
      createdAt: row.created_at,
    };
  } catch {
    return { alegraItemId: String(alegraItemId), createdAt: row.created_at };
  }
}

async function getLatestOrderSync() {
  const pool = getPool();
  const orgId = getOrgId();
  const result = await pool.query<{
    request_json: Record<string, unknown> | null;
    created_at: string;
  }>(
    `
    SELECT request_json, created_at
    FROM sync_logs
    WHERE organization_id = $1
      AND entity = 'order'
      AND request_json ? 'orderId'
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId]
  );
  if (!result.rows.length) {
    return null;
  }
  const request = result.rows[0].request_json || {};
  const orderId = request.orderId as string | undefined;
  if (!orderId) {
    return null;
  }
  return { orderId, createdAt: result.rows[0].created_at };
}

async function buildLogAnalysis(filters: {
  status?: string;
  orderId?: string;
  from?: string;
  to?: string;
  entity?: string;
  direction?: string;
}): Promise<LogAnalysis> {
  const pool = getPool();
  const orgId = getOrgId();
  const conditions: string[] = ["organization_id = $1"];
  const params: Array<string | number> = [orgId];
  let idx = 2;

  const applyFilters = (target: string[]) => {
    target.push(...conditions);
  };

  if (filters.status) {
    conditions.push(`status = $${idx++}`);
    params.push(filters.status);
  }
  if (filters.orderId) {
    conditions.push(`request_json->>'orderId' = $${idx++}`);
    params.push(filters.orderId);
  }
  if (filters.entity) {
    conditions.push(`entity = $${idx++}`);
    params.push(filters.entity);
  }
  if (filters.direction) {
    conditions.push(`direction = $${idx++}`);
    params.push(filters.direction);
  }
  if (filters.from) {
    conditions.push(`created_at >= $${idx++}`);
    params.push(filters.from);
  }
  if (filters.to) {
    conditions.push(`created_at <= $${idx++}`);
    params.push(filters.to);
  }

  const baseWhere = conditions.join(" AND ");

  const totals = await pool.query<{ status: string; total: string }>(
    `
    SELECT status, COUNT(*) as total
    FROM sync_logs
    WHERE ${baseWhere}
    GROUP BY status
    `,
    params
  );
  const statusCounts = totals.rows.reduce<Record<string, number>>(
    (acc: Record<string, number>, row: { status: string; total: string }) => {
      acc[row.status] = Number(row.total || 0);
      return acc;
    },
    {}
  );
  const totalsList = Object.values(statusCounts) as number[];
  const total = totalsList.reduce((sum: number, value: number) => sum + value, 0);
  const failed = statusCounts.fail || 0;
  const success = statusCounts.success || 0;
  const failRate = total ? Math.round((failed / total) * 1000) / 10 : 0;

  const topMessages = await pool.query<{ message: string | null; total: string }>(
    `
    SELECT message, COUNT(*) as total
    FROM sync_logs
    WHERE ${baseWhere}
    GROUP BY message
    ORDER BY COUNT(*) DESC NULLS LAST
    LIMIT 5
    `,
    params
  );

  const recentHour = await pool.query<{ total: string }>(
    `
    SELECT COUNT(*) as total
    FROM sync_logs
    WHERE ${baseWhere}
      AND created_at >= NOW() - interval '1 hour'
    `,
    params
  );

  const comparison = await buildLogComparison(filters);

  return {
    total,
    success,
    failed,
    failRate,
    topMessages: topMessages.rows.map((row: { message: string | null; total: string }) => ({
      message: row.message || "Sin detalle",
      total: Number(row.total || 0),
    })),
    recentHour: Number(recentHour.rows[0]?.total || 0),
    comparison,
  };
}

async function buildLogComparison(filters: {
  from?: string;
  to?: string;
  status?: string;
  orderId?: string;
  entity?: string;
  direction?: string;
}) {
  if (!filters.from) {
    return null;
  }
  const start = new Date(filters.from);
  const end = filters.to ? new Date(filters.to) : new Date();
  const windowMs = end.getTime() - start.getTime();
  if (windowMs <= 0) return null;
  const prevStart = new Date(start.getTime() - windowMs);
  const prevEnd = new Date(start.getTime());

  const pool = getPool();
  const orgId = getOrgId();
  const conditions: string[] = ["organization_id = $1", "created_at >= $2", "created_at < $3"];
  const params: Array<string | number> = [orgId, prevStart.toISOString(), prevEnd.toISOString()];
  let idx = 4;

  if (filters.status) {
    conditions.push(`status = $${idx++}`);
    params.push(filters.status);
  }
  if (filters.orderId) {
    conditions.push(`request_json->>'orderId' = $${idx++}`);
    params.push(filters.orderId);
  }
  if (filters.entity) {
    conditions.push(`entity = $${idx++}`);
    params.push(filters.entity);
  }
  if (filters.direction) {
    conditions.push(`direction = $${idx++}`);
    params.push(filters.direction);
  }

  const result = await pool.query<{ total: string }>(
    `
    SELECT COUNT(*) as total
    FROM sync_logs
    WHERE ${conditions.join(" AND ")}
    `,
    params
  );

  return {
    previousTotal: Number(result.rows[0]?.total || 0),
    previousFrom: prevStart.toISOString(),
    previousTo: prevEnd.toISOString(),
  };
}

function buildLogSummaryText(analysis: LogAnalysis) {
  if (!analysis) return "Resumen no disponible.";
  const base = `Resumen: ${analysis.total} registros · ${analysis.failed} fallidos · ${analysis.success} exitosos · ${analysis.failRate}% fallo.`;
  const recent = analysis.recentHour ? ` Ultima hora: ${analysis.recentHour}.` : " Sin actividad en la ultima hora.";
  let comp = "";
  if (analysis.comparison) {
    const prev = analysis.comparison.previousTotal;
    const delta = analysis.total - prev;
    const sign = delta > 0 ? "+" : "";
    comp = ` Comparativo: ${sign}${delta} vs periodo anterior.`;
  }
  return `${base}${recent}${comp}`;
}

function buildLogSuggestions(analysis: LogAnalysis, filters: { status?: string }) {
  if (!analysis) return "";
  if (filters.status === "success") {
    return " Todo se ve estable. Quieres ver errores recientes?";
  }
  if (analysis.failed > 0) {
    const top = analysis.topMessages?.[0];
    const cause = top ? ` Causa mas frecuente: ${top.message}.` : "";
    const rateHint = analysis.failRate >= 10 ? " La tasa de fallo es alta." : "";
    return `${cause}${rateHint} Puedo reintentar fallidos o abrir el detalle de un pedido.`;
  }
  return " No hay fallos detectados.";
}

async function searchShopifyOrders(orderNumber: string) {
  const ctx = await buildSyncContext();
  const query = `name:${orderNumber.replace(/^#/, "")}`;
  const result = await ctx.shopify.listOrdersByQuery(query);
  const orders = result.orders?.edges?.map((edge) => edge.node) || [];
  return orders.map((order) => ({
    id: order.id,
    name: order.name,
    orderNumber: order.name,
    customer: buildCustomerName(order),
    status: order.displayFinancialStatus || "-",
  }));
}

async function buildDbReport() {
  const pool = getPool();
  const orgId = getOrgId();
  const mappingItems = await pool.query<{ total: string }>(
    `
    SELECT COUNT(*) AS total
    FROM sync_mappings
    WHERE organization_id = $1 AND entity = 'item'
    `,
    [orgId]
  );
  const mappingOrders = await pool.query<{ total: string }>(
    `
    SELECT COUNT(*) AS total
    FROM sync_mappings
    WHERE organization_id = $1 AND entity = 'order'
    `,
    [orgId]
  );
  const failedLogs = await pool.query<{ total: string }>(
    `
    SELECT COUNT(*) AS total
    FROM sync_logs
    WHERE organization_id = $1 AND status = 'fail'
    `,
    [orgId]
  );
  return {
    mappedItems: Number(mappingItems.rows[0]?.total || 0),
    mappedOrders: Number(mappingOrders.rows[0]?.total || 0),
    failedLogs: Number(failedLogs.rows[0]?.total || 0),
  };
}

function extractId(message: string) {
  const match = message.match(/(\d{3,})/);
  return match ? match[1] : null;
}

function extractSku(message: string) {
  const match = message.match(/sku\s*[:#]?\s*([a-z0-9\-_/]+)/i);
  return match ? match[1].trim() : null;
}

function extractLooseSku(message: string) {
  const match = message.match(/(?:publicar|ocultar)\s+([a-z0-9\-_/]+)/i);
  return match ? match[1].trim() : null;
}

function buildCustomerName(order: {
  customer?: { firstName?: string | null; lastName?: string | null } | null;
  email?: string | null;
}) {
  const first = order.customer?.firstName || "";
  const last = order.customer?.lastName || "";
  const full = `${first} ${last}`.trim();
  return full || order.email || "-";
}
