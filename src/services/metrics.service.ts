import { buildSyncContext } from "./sync-context";
import { getOrgId, getPool } from "../db";
import type { ShopifyOrder } from "../connectors/shopify";

type MetricItem = Record<string, unknown>;
export type MetricsRange = "day" | "week" | "month";

export async function getMetrics(
  options: { range?: MetricsRange; days?: number; shopDomain?: string } = {}
) {
  const range = normalizeRange(options.range);
  const { current, previous } = resolveCalendarRanges(range);
  const rangeDays = diffDays(current.from, current.to);
  const rangeFrom = formatDateKey(current.from);
  const rangeTo = formatDateKey(current.to);
  const today = formatDateKey(new Date());
  const yesterday = formatDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));

  const fallback = {
    range,
    rangeLabel: current.label,
    rangeDays,
    rangeFrom,
    rangeTo,
    sales: "0",
    orders: 0,
    customers: 0,
    pending: "0",
    salesRange: "0",
    salesRangePrev: "0",
    salesRangeDelta: "0",
    salesRangeTrend: "up",
    salesRangePct: null as number | null,
    billingRange: "0",
    billingRangePrev: "0",
    billingRangeDelta: "0",
    billingRangeTrend: "up",
    billingRangePct: null as number | null,
    paymentsByMethod: [] as Array<Record<string, unknown>>,
    weeklyRevenue: [] as Array<Record<string, unknown>>,
    weeklyRevenuePrev: [] as Array<Record<string, unknown>>,
    billingSeries: [] as Array<Record<string, unknown>>,
    billingSeriesPrev: [] as Array<Record<string, unknown>>,
    topProductsUnits: [] as Array<Record<string, unknown>>,
    topProductsRevenue: [] as Array<Record<string, unknown>>,
    topCities: [] as Array<Record<string, unknown>>,
    topCustomers: [] as Array<Record<string, unknown>>,
    lowStock: [] as Array<Record<string, unknown>>,
    inactiveProducts: [] as Array<Record<string, unknown>>,
    issues: [] as Array<Record<string, unknown>>,
    effectivenessRate: null as number | null,
    effectivenessTotal: 0,
    failedSyncs24h: 0,
    lastWebhookAt: null as string | null,
    retryPending: 0,
    retryDue: 0,
    ordersDbRange: 0,
    invoicedDbRange: 0,
    pendingDbRange: 0,
    repeatCustomers: [] as Array<Record<string, unknown>>,
    repeatRate: null as number | null,
    source: "db_only" as "db_only" | "external",
  };

  const [logInsightsResult, effectivenessResult, issuesResult, dbResult, dbCommerceResult, dbCommercePrevResult] =
    await Promise.allSettled([
      getLogInsights(),
      getOrderEffectiveness(current.from, current.to),
      listIssues(current.from, current.to),
      getDbOrderSummary(current.from, current.to, options.shopDomain),
      getDbCommerceMetrics(current.from, current.to, options.shopDomain),
      getDbCommerceMetrics(previous.from, previous.to, options.shopDomain),
    ]);
  if (logInsightsResult.status === "fulfilled") {
    fallback.failedSyncs24h = logInsightsResult.value.failedSyncs24h;
    fallback.lastWebhookAt = logInsightsResult.value.lastWebhookAt;
  }
  if (effectivenessResult.status === "fulfilled") {
    fallback.effectivenessRate = effectivenessResult.value.rate;
    fallback.effectivenessTotal = effectivenessResult.value.total;
  }
  if (issuesResult.status === "fulfilled") {
    fallback.issues = issuesResult.value;
  }
  if (dbResult.status === "fulfilled") {
    fallback.retryPending = dbResult.value.retryPending;
    fallback.retryDue = dbResult.value.retryDue;
    fallback.ordersDbRange = dbResult.value.orders;
    fallback.invoicedDbRange = dbResult.value.invoiced;
    fallback.pendingDbRange = dbResult.value.pending;
    if (dbResult.value.salesRange) {
      fallback.salesRange = formatCurrency(dbResult.value.salesRange);
      fallback.sales = fallback.salesRange;
    }
    if (dbResult.value.billingRange) {
      fallback.billingRange = formatCurrency(dbResult.value.billingRange);
      fallback.pending = formatCurrency(dbResult.value.pendingBalance);
    }
  }
  if (dbCommerceResult.status === "fulfilled") {
    fallback.weeklyRevenue = dbCommerceResult.value.salesSeries;
    fallback.billingSeries = dbCommerceResult.value.billingSeries;
    fallback.topProductsUnits = dbCommerceResult.value.topProductsUnits;
    fallback.topProductsRevenue = dbCommerceResult.value.topProductsRevenue;
    fallback.topCustomers = dbCommerceResult.value.topCustomers;
    fallback.repeatCustomers = dbCommerceResult.value.repeatCustomers;
    fallback.repeatRate = dbCommerceResult.value.repeatRate;
  }
  if (dbCommercePrevResult.status === "fulfilled") {
    fallback.weeklyRevenuePrev = dbCommercePrevResult.value.salesSeries;
    fallback.billingSeriesPrev = dbCommercePrevResult.value.billingSeries;
  }

  try {
    const ctx = await buildSyncContext(options.shopDomain);
    const pageSize = 30;
    const maxPages = Math.max(1, Number(process.env.METRICS_MAX_PAGES || 10));
    const metricsTimeoutMs = Math.max(1000, Number(process.env.METRICS_TIMEOUT_MS || 8000));
    const [payments, invoices, contacts] = await Promise.all([
      fetchAllPages<MetricItem>(
        (start) =>
          ctx.alegra.listPayments({ limit: pageSize, start }) as Promise<Array<MetricItem>>,
        pageSize,
        maxPages,
        metricsTimeoutMs
      ),
      fetchAllPages<MetricItem>(
        (start) =>
          ctx.alegra.listInvoices({ limit: pageSize, start }) as Promise<Array<MetricItem>>,
        pageSize,
        maxPages,
        metricsTimeoutMs
      ),
      fetchAllPages<MetricItem>(
        (start) =>
          ctx.alegra.listContacts({ limit: pageSize, start }) as Promise<Array<MetricItem>>,
        pageSize,
        maxPages,
        metricsTimeoutMs
      ),
    ]);

    const paymentsInRange = filterByRange(payments, current.from, current.to);
    const invoicesInRange = filterByRange(invoices, current.from, current.to);
    const contactsInRange = filterByRange(contacts, current.from, current.to);

    const salesToday = sumByDate(payments, today);
    const salesYesterday = sumByDate(payments, yesterday);
    const ordersToday = countByDate(invoices, today);
    const newCustomers = countByDate(contacts, today);
    const pending = sumPending(invoices);
    const salesTodayDelta = salesToday - salesYesterday;
    const salesTodayPct = salesYesterday ? (salesTodayDelta / salesYesterday) * 100 : null;

    const paymentsByMethod = groupPaymentsByMethod(paymentsInRange);
    const shopifyOrders = await listShopifyOrdersInRange(ctx, current.from, current.to);
    const shopifyOrdersPrev = await listShopifyOrdersInRange(ctx, previous.from, previous.to);
    const salesRangeValue = sumShopifyOrders(shopifyOrders);
    const salesRangePrevValue = sumShopifyOrders(shopifyOrdersPrev);
    const salesRangeDeltaValue = salesRangeValue - salesRangePrevValue;
    const salesRangePct =
      salesRangePrevValue > 0
        ? Math.round((salesRangeDeltaValue / salesRangePrevValue) * 100)
        : null;
    const billingRangeValue = sumInvoices(invoicesInRange);
    const invoicesPrev = filterByRange(invoices, previous.from, previous.to);
    const billingRangePrevValue = sumInvoices(invoicesPrev);
    const billingRangeDeltaValue = billingRangeValue - billingRangePrevValue;
    const billingRangePct =
      billingRangePrevValue > 0
        ? Math.round((billingRangeDeltaValue / billingRangePrevValue) * 100)
        : null;
    const weeklyRevenue = buildDailyShopifySeriesRange(shopifyOrders, current.from, current.to);
    const weeklyRevenuePrev = buildDailyShopifySeriesRange(
      shopifyOrdersPrev,
      previous.from,
      previous.to
    );
    const billingSeries = buildDailyInvoiceSeriesRange(invoicesInRange, current.from, current.to);
    const billingSeriesPrev = buildDailyInvoiceSeriesRange(
      invoicesPrev,
      previous.from,
      previous.to
    );
    const invoiceSeries = buildDailyCountSeriesRange(invoicesInRange, current.from, current.to);
    const orderSeries = await buildOrderSeriesRange(current.from, current.to);
    const ordersVsInvoices = buildOrdersVsInvoices(
      orderSeries,
      invoiceSeries,
      buildDateListRange(current.from, current.to)
    );
    const aggregations = buildShopifyAggregations(shopifyOrders);
    const inventoryAlerts = await buildInventoryAlerts(ctx);

    return {
      ...fallback,
      source: "external" as const,
      sales: formatCurrency(salesToday),
      orders: ordersToday,
      customers: newCustomers,
      pending: formatCurrency(pending),
      sales7d: formatCurrency(sumByDateRange(payments, 7)),
      sales30d: formatCurrency(sumByDateRange(payments, 30)),
      orders7d: countByDateRange(invoices, 7),
      orders30d: countByDateRange(invoices, 30),
      customers7d: countByDateRange(contacts, 7),
      customers30d: countByDateRange(contacts, 30),
      salesRange: formatCurrency(salesRangeValue),
      salesRangePrev: formatCurrency(salesRangePrevValue),
      salesRangeDelta: formatCurrency(Math.abs(salesRangeDeltaValue)),
      salesRangeTrend: salesRangeDeltaValue >= 0 ? "up" : "down",
      salesRangePct,
      billingRange: formatCurrency(billingRangeValue),
      billingRangePrev: formatCurrency(billingRangePrevValue),
      billingRangeDelta: formatCurrency(Math.abs(billingRangeDeltaValue)),
      billingRangeTrend: billingRangeDeltaValue >= 0 ? "up" : "down",
      billingRangePct,
      ordersRange: countByRange(invoicesInRange, current.from, current.to),
      customersRange: countByRange(contactsInRange, current.from, current.to),
      ordersToday: countByDate(invoices, today),
      invoicesToday: countByDate(invoices, today),
      salesToday: formatCurrency(salesToday),
      salesYesterday: formatCurrency(salesYesterday),
      salesTodayDelta: formatCurrency(Math.abs(salesTodayDelta)),
      salesTodayTrend: salesTodayDelta >= 0 ? "up" : "down",
      salesTodayPct: salesTodayPct !== null ? Math.round(salesTodayPct) : null,
      paymentsByMethod,
      weeklyRevenue,
      weeklyRevenuePrev,
      billingSeries,
      billingSeriesPrev,
      ordersVsInvoices,
      topProductsUnits: aggregations.topProductsUnits,
      topProductsRevenue: aggregations.topProductsRevenue,
      topCities: aggregations.topCities,
      topCustomers: aggregations.topCustomers,
      repeatCustomers: aggregations.repeatCustomers,
      repeatRate: aggregations.repeatRate,
      lowStock: inventoryAlerts.lowStock,
      inactiveProducts: inventoryAlerts.inactive,
      topProducts: [],
      latestOrders: [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "No disponible";
    return { ...fallback, error: message };
  }
}

type DbOrderMetricRow = {
  processed_at: string | null;
  created_at: string;
  total: string | number | null;
  currency: string | null;
  customer_email: string | null;
  customer_name: string | null;
  products_summary: string | null;
  alegra_invoice_id: string | null;
  invoice_number: string | null;
};

function parseProductsSummary(summary: string) {
  const text = String(summary || "").trim();
  if (!text || text === "-") return [];
  return text
    .split(/\s*,\s*/g)
    .map((chunk) => {
      const trimmed = chunk.trim();
      const match = trimmed.match(/^(\d+)\s*x\s*(.+)$/i);
      if (!match) return null;
      const qty = Number(match[1] || 0);
      const name = String(match[2] || "").trim();
      if (!Number.isFinite(qty) || qty <= 0 || !name) return null;
      return { qty, name };
    })
    .filter(Boolean) as Array<{ qty: number; name: string }>;
}

async function getDbCommerceMetrics(from: Date, to: Date, shopDomain?: string) {
  const pool = getPool();
  const orgId = getOrgId();
  const domain = String(shopDomain || "").trim().toLowerCase();
  const result = await pool.query<DbOrderMetricRow>(
    `
    SELECT
      processed_at,
      created_at,
      total,
      currency,
      customer_email,
      customer_name,
      products_summary,
      alegra_invoice_id,
      invoice_number
    FROM orders
    WHERE organization_id = $1
      AND source = 'shopify'
      AND COALESCE(processed_at, created_at) >= $2
      AND COALESCE(processed_at, created_at) <= $3
      AND ($4 = '' OR shop_domain = $4)
    ORDER BY COALESCE(processed_at, created_at) DESC
    `,
    [orgId, from.toISOString(), to.toISOString(), domain]
  );

  const salesByDay = new Map<string, number>();
  const billingByDay = new Map<string, number>();
  const products = new Map<string, { name: string; units: number; amount: number }>();
  const customers = new Map<string, { name: string; email: string | null; total: number; count: number }>();

  for (const row of result.rows) {
    const date = String(row.processed_at || row.created_at || "").slice(0, 10);
    const total = Number(row.total || 0);
    if (date) {
      salesByDay.set(date, (salesByDay.get(date) || 0) + (Number.isFinite(total) ? total : 0));
      const invoiced = Boolean(row.alegra_invoice_id || row.invoice_number);
      if (invoiced) {
        billingByDay.set(date, (billingByDay.get(date) || 0) + (Number.isFinite(total) ? total : 0));
      }
    }

    const email = row.customer_email ? String(row.customer_email).trim().toLowerCase() : "";
    const name = row.customer_name ? String(row.customer_name).trim() : "";
    const customerKey = email || name || "cliente";
    const current = customers.get(customerKey) || {
      name: name || (email ? email : "Cliente"),
      email: email || null,
      total: 0,
      count: 0,
    };
    current.total += Number.isFinite(total) ? total : 0;
    current.count += 1;
    customers.set(customerKey, current);

    const items = parseProductsSummary(String(row.products_summary || ""));
    if (!items.length) continue;
    const unitsTotal = items.reduce((acc, item) => acc + Number(item.qty || 0), 0);
    if (!unitsTotal) continue;
    for (const item of items) {
      const existing = products.get(item.name) || { name: item.name, units: 0, amount: 0 };
      existing.units += item.qty;
      const portion = Number.isFinite(total) ? total * (item.qty / unitsTotal) : 0;
      existing.amount += portion;
      products.set(item.name, existing);
    }
  }

  const salesSeries = Array.from(salesByDay.entries())
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const billingSeries = Array.from(billingByDay.entries())
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const topProductsUnits = Array.from(products.values())
    .sort((a, b) => b.units - a.units)
    .slice(0, 10);
  const topProductsRevenue = Array.from(products.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  const topCustomers = Array.from(customers.values())
    .map((item) => ({
      name: item.name,
      email: item.email,
      total: item.total,
      avgTicket: item.count ? item.total / item.count : 0,
      count: item.count,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const repeatCustomers = Array.from(customers.values())
    .filter((item) => item.count >= 2)
    .map((item) => ({
      name: item.name,
      email: item.email,
      total: item.total,
      avgTicket: item.count ? item.total / item.count : 0,
      count: item.count,
    }))
    .sort((a, b) => b.count - a.count || b.total - a.total)
    .slice(0, 10);

  const totalOrders = result.rows.length;
  const repeatOrders = Array.from(customers.values())
    .filter((item) => item.count >= 2)
    .reduce((acc, item) => acc + item.count, 0);
  const repeatRate = totalOrders ? Math.round((repeatOrders / totalOrders) * 100) : null;

  return {
    salesSeries,
    billingSeries,
    topProductsUnits,
    topProductsRevenue,
    topCustomers,
    repeatCustomers,
    repeatRate,
  };
}

async function getDbOrderSummary(from: Date, to: Date, shopDomain?: string) {
  const pool = getPool();
  const orgId = getOrgId();
  const domain = String(shopDomain || "").trim().toLowerCase();
  const result = await pool.query<{
    orders: string;
    invoiced: string;
    pending: string;
    sales: string | null;
    billing: string | null;
    pending_balance: string | null;
  }>(
    `
    SELECT
      COUNT(*) FILTER (WHERE source = 'shopify') AS orders,
      COUNT(*) FILTER (WHERE alegra_invoice_id IS NOT NULL OR invoice_number IS NOT NULL) AS invoiced,
      COUNT(*) FILTER (
        WHERE source = 'shopify'
          AND COALESCE(alegra_status, '') <> 'facturado'
      ) AS pending,
      COALESCE(SUM(total) FILTER (WHERE source = 'shopify'), 0) AS sales,
      COALESCE(SUM(total) FILTER (WHERE alegra_invoice_id IS NOT NULL OR invoice_number IS NOT NULL), 0) AS billing,
      COALESCE(SUM(total) FILTER (
        WHERE source = 'shopify'
          AND COALESCE(alegra_status, '') <> 'facturado'
      ), 0) AS pending_balance
    FROM orders
    WHERE organization_id = $1
      AND created_at >= $2
      AND created_at <= $3
      AND ($4 = '' OR shop_domain = $4)
    `,
    [orgId, from.toISOString(), to.toISOString(), domain]
  );
  const row = result.rows[0] || {
    orders: "0",
    invoiced: "0",
    pending: "0",
    sales: "0",
    billing: "0",
    pending_balance: "0",
  };
  const retryPendingRes = await pool.query<{ total: string }>(
    `
    SELECT COUNT(*) AS total
    FROM retry_queue q
    JOIN sync_logs l ON l.id = q.sync_log_id
    WHERE l.organization_id = $1
      AND q.status = 'pending'
    `,
    [orgId]
  );
  const retryDueRes = await pool.query<{ total: string }>(
    `
    SELECT COUNT(*) AS total
    FROM retry_queue q
    JOIN sync_logs l ON l.id = q.sync_log_id
    WHERE l.organization_id = $1
      AND q.status = 'pending'
      AND q.next_run_at <= NOW()
    `,
    [orgId]
  );
  return {
    orders: Number(row.orders || 0),
    invoiced: Number(row.invoiced || 0),
    pending: Number(row.pending || 0),
    salesRange: Number(row.sales || 0),
    billingRange: Number(row.billing || 0),
    pendingBalance: Number(row.pending_balance || 0),
    retryPending: retryPendingRes.rows.length ? Number(retryPendingRes.rows[0].total || 0) : 0,
    retryDue: retryDueRes.rows.length ? Number(retryDueRes.rows[0].total || 0) : 0,
  };
}

function sumByDate(items: Array<MetricItem>, date: string) {
  return items
    .filter((item) => String(item.date || "").startsWith(date))
    .reduce((acc, item) => acc + Number(item.amount || 0), 0);
}

function countByDate(items: Array<MetricItem>, date: string) {
  return items.filter((item) => String(item.date || item.createdAt || "").startsWith(date))
    .length;
}

function sumPending(invoices: Array<MetricItem>) {
  return invoices.reduce((acc, item) => acc + Number(item.balance || 0), 0);
}

function formatCurrency(value: number) {
  return value ? new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(value) : "0";
}

function normalizeRange(raw: unknown): MetricsRange {
  if (raw === "day" || raw === "week" || raw === "month") return raw;
  return "month";
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function diffDays(from: Date, to: Date) {
  const msDay = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / msDay) + 1);
}

function resolveCalendarRanges(range: MetricsRange) {
  if (range === "day") return resolveCalendarDayRanges();
  if (range === "week") return resolveCalendarWeekRanges();
  return resolveCalendarMonthRanges();
}

function resolveCalendarMonthRanges() {
  const now = new Date();
  const currentFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const previousFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousTo = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
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

function resolveCalendarWeekRanges() {
  const now = new Date();
  const currentFrom = startOfWeek(now);
  const currentTo = endOfWeek(now);
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

function resolveCalendarDayRanges() {
  const now = new Date();
  const currentFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentTo = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
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

function sumByDateRange(items: Array<MetricItem>, days: number) {
  const dates = buildDateSet(days);
  return items
    .filter((item) => dates.has(extractDate(item)))
    .reduce((acc, item) => acc + Number(item.amount || 0), 0);
}

function countByDateRange(items: Array<MetricItem>, days: number) {
  const dates = buildDateSet(days);
  return items.filter((item) => dates.has(extractDate(item))).length;
}

function filterByRange(items: Array<MetricItem>, from: Date, to: Date) {
  const fromKey = formatDateKey(from);
  const toKey = formatDateKey(to);
  return items.filter((item) => {
    const date = extractDate(item);
    return date >= fromKey && date <= toKey;
  });
}

function sumByRange(items: Array<MetricItem>, from: Date, to: Date) {
  const fromKey = formatDateKey(from);
  const toKey = formatDateKey(to);
  return items
    .filter((item) => {
      const date = extractDate(item);
      return date >= fromKey && date <= toKey;
    })
    .reduce((acc, item) => acc + Number(item.amount || 0), 0);
}

function countByRange(items: Array<MetricItem>, from: Date, to: Date) {
  const fromKey = formatDateKey(from);
  const toKey = formatDateKey(to);
  return items.filter((item) => {
    const date = extractDate(item);
    return date >= fromKey && date <= toKey;
  }).length;
}

function groupPaymentsByMethod(items: Array<MetricItem>) {
  const totals = new Map<string, number>();
  for (const item of items) {
    const method =
      String(item.paymentMethod || item.payment_method || item.method || "Otros");
    const amount = Number(item.amount || 0);
    totals.set(method, (totals.get(method) || 0) + amount);
  }
  return Array.from(totals.entries())
    .map(([method, amount]) => ({ method, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);
}

function buildDailySeries(items: Array<MetricItem>, days: number) {
  const series = [];
  const dates = buildDateList(days);
  const totals = new Map<string, number>();
  for (const item of items) {
    const date = extractDate(item);
    if (!date) continue;
    totals.set(date, (totals.get(date) || 0) + Number(item.amount || 0));
  }
  for (const date of dates) {
    series.push({ date, amount: totals.get(date) || 0 });
  }
  return series;
}

function buildDailyCountSeries(items: Array<MetricItem>, days: number) {
  const series = [];
  const dates = buildDateList(days);
  const totals = new Map<string, number>();
  for (const item of items) {
    const date = extractDate(item);
    if (!date) continue;
    totals.set(date, (totals.get(date) || 0) + 1);
  }
  for (const date of dates) {
    series.push({ date, total: totals.get(date) || 0 });
  }
  return series;
}

function buildDailySeriesRange(items: Array<MetricItem>, from: Date, to: Date) {
  const series = [];
  const dates = buildDateListRange(from, to);
  const totals = new Map<string, number>();
  for (const item of items) {
    const date = extractDate(item);
    if (!date) continue;
    totals.set(date, (totals.get(date) || 0) + Number(item.amount || 0));
  }
  for (const date of dates) {
    series.push({ date, amount: totals.get(date) || 0 });
  }
  return series;
}

function sumShopifyOrders(orders: ShopifyOrder[]) {
  return orders.reduce(
    (acc, order) => acc + Number(order.totalPriceSet?.shopMoney.amount || 0),
    0
  );
}

function sumInvoices(invoices: Array<MetricItem>) {
  return invoices.reduce((acc, item) => acc + extractInvoiceTotal(item), 0);
}

function buildDailyShopifySeriesRange(orders: ShopifyOrder[], from: Date, to: Date) {
  const series = [];
  const dates = buildDateListRange(from, to);
  const totals = new Map<string, number>();
  for (const order of orders) {
    const date = extractShopifyDate(order);
    if (!date) continue;
    totals.set(date, (totals.get(date) || 0) + Number(order.totalPriceSet?.shopMoney.amount || 0));
  }
  for (const date of dates) {
    series.push({ date, amount: totals.get(date) || 0 });
  }
  return series;
}

function buildDailyInvoiceSeriesRange(items: Array<MetricItem>, from: Date, to: Date) {
  const series = [];
  const dates = buildDateListRange(from, to);
  const totals = new Map<string, number>();
  for (const item of items) {
    const date = extractDate(item);
    if (!date) continue;
    totals.set(date, (totals.get(date) || 0) + extractInvoiceTotal(item));
  }
  for (const date of dates) {
    series.push({ date, amount: totals.get(date) || 0 });
  }
  return series;
}

function buildDailyCountSeriesRange(items: Array<MetricItem>, from: Date, to: Date) {
  const series = [];
  const dates = buildDateListRange(from, to);
  const totals = new Map<string, number>();
  for (const item of items) {
    const date = extractDate(item);
    if (!date) continue;
    totals.set(date, (totals.get(date) || 0) + 1);
  }
  for (const date of dates) {
    series.push({ date, total: totals.get(date) || 0 });
  }
  return series;
}

function buildOrdersVsInvoices(
  orders: Array<{ date: string; total: number }>,
  invoices: Array<{ date: string; total: number }>,
  dates: string[]
) {
  const ordersMap = new Map(orders.map((item) => [item.date, item.total]));
  const invoicesMap = new Map(invoices.map((item) => [item.date, item.total]));
  return dates.map((date) => ({
    date,
    orders: ordersMap.get(date) || 0,
    invoices: invoicesMap.get(date) || 0,
  }));
}

function buildDateList(days: number) {
  const list: string[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    list.push(date.toISOString().slice(0, 10));
  }
  return list;
}

function buildDateListRange(from: Date, to: Date) {
  const list: string[] = [];
  const current = new Date(from.getTime());
  current.setHours(0, 0, 0, 0);
  const end = new Date(to.getTime());
  end.setHours(0, 0, 0, 0);
  while (current <= end) {
    list.push(formatDateKey(current));
    current.setDate(current.getDate() + 1);
  }
  return list;
}

function buildDateSet(days: number) {
  return new Set(buildDateList(days));
}

function extractDate(item: MetricItem) {
  return String(item.date || item.createdAt || item.datetime || "").slice(0, 10);
}

function extractInvoiceTotal(item: MetricItem) {
  const value =
    item.total ??
    item.totalAmount ??
    item.total_amount ??
    item.totalValue ??
    item.total_value ??
    item.amount ??
    0;
  return Number(value || 0);
}

function extractShopifyDate(order: ShopifyOrder) {
  return String(order.processedAt || order.updatedAt || "").slice(0, 10);
}

async function getOrderEffectiveness(from: Date, to: Date) {
  const pool = getPool();
  const orgId = getOrgId();
  const result = await pool.query<{ status: string; total: string }>(
    `
    SELECT status, COUNT(*) AS total
    FROM sync_logs
    WHERE organization_id = $1
      AND entity = 'order'
      AND created_at >= $2
      AND created_at <= $3
      AND status IN ('success', 'fail')
    GROUP BY status
    `,
    [orgId, from.toISOString(), to.toISOString()]
  );
  const map = new Map(result.rows.map((row) => [row.status, Number(row.total || 0)]));
  const success = map.get("success") || 0;
  const fail = map.get("fail") || 0;
  const total = success + fail;
  return {
    total,
    rate: total ? Math.round((success / total) * 100) : null,
  };
}

async function listShopifyOrdersInRange(
  ctx: Awaited<ReturnType<typeof buildSyncContext>>,
  from: Date,
  to: Date
) {
  const fromKey = formatDateKey(from);
  const toKey = formatDateKey(to);
  const query = `status:any processed_at:>='${fromKey}' processed_at:<='${toKey}'`;
  const maxOrders = Math.max(100, Number(process.env.METRICS_SHOPIFY_MAX_ORDERS || 500));
  return ctx.shopify.listAllOrdersByQuery(query, maxOrders);
}

function buildShopifyAggregations(orders: ShopifyOrder[]) {
  const products = new Map<string, { name: string; units: number; amount: number }>();
  const cities = new Map<string, number>();
  const customers = new Map<
    string,
    { name: string; total: number; count: number; email?: string | null }
  >();

  orders.forEach((order) => {
    const orderAmount = Number(order.totalPriceSet?.shopMoney.amount || 0);
    const customerName = [order.customer?.firstName, order.customer?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    const customerEmail = order.customer?.email || order.email || null;
    const customerKey = order.customer?.id || customerEmail || order.id;
    if (customerKey) {
      const existing = customers.get(customerKey) || {
        name: customerName || customerEmail || "Cliente",
        total: 0,
        count: 0,
        email: customerEmail,
      };
      existing.total += orderAmount;
      existing.count += 1;
      customers.set(customerKey, existing);
    }

    const city = String(order.shippingAddress?.city || "").trim();
    if (city) {
      cities.set(city, (cities.get(city) || 0) + 1);
    }

    order.lineItems?.edges?.forEach((edge) => {
      const item = edge.node;
      const name = item.title || "Producto";
      const unitPrice = Number(
        item.discountedUnitPriceSet?.shopMoney.amount ||
          item.originalUnitPriceSet?.shopMoney.amount ||
          0
      );
      const amount = unitPrice * Number(item.quantity || 0);
      const existing = products.get(name) || { name, units: 0, amount: 0 };
      existing.units += Number(item.quantity || 0);
      existing.amount += amount;
      products.set(name, existing);
    });
  });

  const topProductsUnits = Array.from(products.values())
    .sort((a, b) => b.units - a.units)
    .slice(0, 10);
  const topProductsRevenue = Array.from(products.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);
  const topCities = Array.from(cities.entries())
    .map(([city, total]) => ({ city, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
  const topCustomers = Array.from(customers.values())
    .map((item) => ({
      name: item.name,
      total: item.total,
      avgTicket: item.count ? item.total / item.count : 0,
      count: item.count,
      email: item.email || null,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const repeatCustomers = topCustomers.filter((item) => Number(item.count || 0) >= 2);
  const totalOrders = orders.length;
  const repeatOrders = Array.from(customers.values())
    .filter((item) => item.count >= 2)
    .reduce((acc, item) => acc + item.count, 0);
  const repeatRate = totalOrders ? Math.round((repeatOrders / totalOrders) * 100) : null;

  return { topProductsUnits, topProductsRevenue, topCities, topCustomers, repeatCustomers, repeatRate };
}

async function buildInventoryAlerts(ctx: Awaited<ReturnType<typeof buildSyncContext>>) {
  const pageSize = 30;
  const maxPages = Math.max(1, Number(process.env.METRICS_MAX_PAGES || 10));
  const metricsTimeoutMs = Math.max(1000, Number(process.env.METRICS_TIMEOUT_MS || 8000));

  const items = await fetchAllPages<MetricItem>(
    async (start) => {
      const payload = (await ctx.alegra.listItems({ limit: pageSize, start })) as MetricItem;
      if (Array.isArray(payload)) return payload as MetricItem[];
      if (payload && Array.isArray((payload as { items?: MetricItem[] }).items)) {
        return (payload as { items?: MetricItem[] }).items || [];
      }
      if (payload && Array.isArray((payload as { data?: MetricItem[] }).data)) {
        return (payload as { data?: MetricItem[] }).data || [];
      }
      return [];
    },
    pageSize,
    maxPages,
    metricsTimeoutMs
  );

  const salesBySku = new Map<string, number>();
  const windowDays = Math.max(7, Number(process.env.METRICS_INVENTORY_SALES_DAYS || 30));
  const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const windowOrders = await listShopifyOrdersInRange(ctx, windowStart, new Date());
  windowOrders.forEach((order) => {
    order.lineItems?.edges?.forEach((edge) => {
      const sku = edge.node.variant?.sku || "";
      if (!sku) return;
      salesBySku.set(sku, (salesBySku.get(sku) || 0) + Number(edge.node.quantity || 0));
    });
  });

  const lowStock: Array<{ name: string; stock: number; sold: number; windowDays: number }> = [];
  const inactive: Array<{ name: string; stock: number; sold: number; windowDays: number }> = [];

  items.forEach((item) => {
    const name = String(item.name || item.reference || item.id || "Producto");
    const stock = resolveItemQuantity(item);
    if (!Number.isFinite(stock) || stock <= 0) return;
    const identifiers = collectItemIdentifiers(item);
    const sold = identifiers.reduce((acc, id) => acc + (salesBySku.get(id) || 0), 0);
    if (stock <= 5 && sold > 0) {
      lowStock.push({ name, stock, sold, windowDays });
      return;
    }
    if (sold === 0) {
      inactive.push({ name, stock, sold: 0, windowDays });
    }
  });

  lowStock.sort((a, b) => b.sold - a.sold || a.stock - b.stock);
  inactive.sort((a, b) => b.stock - a.stock);

  return {
    lowStock: lowStock.slice(0, 10),
    inactive: inactive.slice(0, 10),
  };
}

function resolveItemQuantity(item: MetricItem) {
  if (Array.isArray(item.itemVariants) && item.itemVariants.length) {
    return item.itemVariants.reduce((acc: number, variant: MetricItem) => {
      const qty = Number(resolveInventoryQuantity(variant) || 0);
      return acc + (Number.isFinite(qty) ? qty : 0);
    }, 0);
  }
  const qty = Number(resolveInventoryQuantity(item) || 0);
  return Number.isFinite(qty) ? qty : 0;
}

function resolveInventoryQuantity(item: MetricItem) {
  const inv = (item as { inventory?: unknown }).inventory;
  if (!inv || typeof inv !== "object") return 0;
  const quantity = (inv as { quantity?: unknown }).quantity;
  const value = Number(quantity || 0);
  return Number.isFinite(value) ? value : 0;
}

function collectItemIdentifiers(item: MetricItem) {
  const identifiers: string[] = [];
  const push = (value?: string | number) => {
    const trimmed = String(value ?? "").trim();
    if (trimmed) identifiers.push(trimmed);
  };
  push(item.reference as string | number | undefined);
  push(item.barcode as string | number | undefined);
  push(item.code as string | number | undefined);
  if (Array.isArray(item.itemVariants)) {
    item.itemVariants.forEach((variant: MetricItem) => {
      push(variant.reference as string | number | undefined);
      push(variant.barcode as string | number | undefined);
    });
  }
  return Array.from(new Set(identifiers));
}

async function listIssues(from: Date, to: Date) {
  const pool = getPool();
  const orgId = getOrgId();
  const result = await pool.query<{
    entity: string;
    message: string | null;
    created_at: string;
  }>(
    `
    SELECT entity, message, created_at
    FROM sync_logs
    WHERE organization_id = $1
      AND status = 'fail'
      AND created_at >= $2
      AND created_at <= $3
    ORDER BY created_at DESC
    LIMIT 10
    `,
    [orgId, from.toISOString(), to.toISOString()]
  );
  return result.rows.map((row) => classifyIssue(row.entity, row.message || ""));
}

function classifyIssue(entity: string, message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("e-invoice") || normalized.includes("e factura") || normalized.includes("e-factura")) {
    return {
      problem: "Factura fallida",
      cause: "Datos de cliente incompletos (NIT/Dirección)",
      action: "Contactar al cliente y completar datos.",
    };
  }
  if (normalized.includes("address") || normalized.includes("direcci") || normalized.includes("shipping")) {
    return {
      problem: "Guía no generada",
      cause: "Dirección de envío no reconocida",
      action: "Corregir dirección en el panel.",
    };
  }
  if (normalized.includes("payment") || normalized.includes("pago")) {
    return {
      problem: "Error de pago",
      cause: "Transacción rechazada en pasarela",
      action: "Enviar cupón de recuperación.",
    };
  }
  if (entity === "inventory") {
    return {
      problem: "Ajuste de inventario fallido",
      cause: "Inconsistencia de stock",
      action: "Revisar stock en Alegra y reintentar.",
    };
  }
  return {
    problem: "Fallo de sincronización",
    cause: "Error operativo o datos incompletos",
    action: "Reintentar y revisar logs.",
  };
}

async function buildOrderSeriesRange(from: Date, to: Date) {
  const pool = getPool();
  const orgId = getOrgId();
  const since = from.toISOString();
  const until = to.toISOString();
  const result = await pool.query<{
    date: string;
    total: string;
  }>(
    `
    SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS date,
           COUNT(*) AS total
    FROM sync_logs
    WHERE organization_id = $1
      AND entity = 'order'
      AND created_at >= $2
      AND created_at <= $3
    GROUP BY 1
    ORDER BY 1
    `,
    [orgId, since, until]
  );
  return result.rows.map((row: { date: string; total: string }) => ({
    date: row.date,
    total: Number(row.total || 0),
  }));
}

async function getLogInsights() {
  const pool = getPool();
  const orgId = getOrgId();
  const failed = await pool.query<{ total: string }>(
    `
    SELECT COUNT(*) AS total
    FROM sync_logs
    WHERE organization_id = $1
      AND status = 'fail'
      AND created_at >= NOW() - INTERVAL '24 hours'
    `,
    [orgId]
  );
  const lastWebhook = await pool.query<{ created_at: string }>(
    `
    SELECT created_at
    FROM sync_logs
    WHERE organization_id = $1
      AND entity IN ('product', 'inventory', 'order')
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId]
  );
  return {
    failedSyncs24h: failed.rows.length ? Number(failed.rows[0].total || 0) : 0,
    lastWebhookAt: lastWebhook.rows.length ? lastWebhook.rows[0].created_at : null,
  };
}

async function fetchAllPages<T>(
  fetchPage: (start: number) => Promise<Array<T>>,
  pageSize: number,
  maxPages: number,
  maxDurationMs: number
) {
  const startedAt = Date.now();
  const items: Array<T> = [];
  for (let page = 0; page < maxPages; page += 1) {
    if (Date.now() - startedAt > maxDurationMs) {
      break;
    }
    const start = page * pageSize;
    const batch = await fetchPage(start);
    if (!Array.isArray(batch) || !batch.length) {
      break;
    }
    items.push(...batch);
    if (batch.length < pageSize) {
      break;
    }
  }
  return items;
}
