import { buildSyncContext } from "./sync-context";
import { getOrgId, getPool } from "../db";

export async function getMetrics(rangeDays = 30) {
  try {
    const ctx = await buildSyncContext();
    const today = new Date().toISOString().slice(0, 10);
    const safeRangeDays = Number.isFinite(rangeDays) && rangeDays > 0 ? rangeDays : 30;

    const pageSize = 30;
    const maxPages = Math.max(1, Number(process.env.METRICS_MAX_PAGES || 10));
    const metricsTimeoutMs = Math.max(1000, Number(process.env.METRICS_TIMEOUT_MS || 8000));
    const [payments, invoices, contacts] = await Promise.all([
      fetchAllPages(
        (start) => ctx.alegra.listPayments({ limit: pageSize, start }),
        pageSize,
        maxPages,
        metricsTimeoutMs
      ),
      fetchAllPages(
        (start) => ctx.alegra.listInvoices({ limit: pageSize, start }),
        pageSize,
        maxPages,
        metricsTimeoutMs
      ),
      fetchAllPages(
        (start) => ctx.alegra.listContacts({ limit: pageSize, start }),
        pageSize,
        maxPages,
        metricsTimeoutMs
      ),
    ]);

    const salesToday = sumByDate(payments, today);
    const ordersToday = countByDate(invoices, today);
    const newCustomers = countByDate(contacts, today);
    const pending = sumPending(invoices);

    const paymentsByMethod = groupPaymentsByMethod(payments);
    const weeklyRevenue = buildDailySeries(payments, safeRangeDays);
    const invoiceSeries = buildDailyCountSeries(invoices, safeRangeDays);
    const orderSeries = await buildOrderSeries(safeRangeDays);
    const ordersVsInvoices = buildOrdersVsInvoices(orderSeries, invoiceSeries, safeRangeDays);
    const { failedSyncs24h, lastWebhookAt } = await getLogInsights();

    return {
      rangeDays: safeRangeDays,
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
      salesRange: formatCurrency(sumByDateRange(payments, safeRangeDays)),
      ordersRange: countByDateRange(invoices, safeRangeDays),
      customersRange: countByDateRange(contacts, safeRangeDays),
      ordersToday: countByDate(invoices, today),
      invoicesToday: countByDate(invoices, today),
      failedSyncs24h,
      lastWebhookAt,
      paymentsByMethod,
      weeklyRevenue,
      ordersVsInvoices,
      topProducts: [],
      latestOrders: [],
    };
  } catch (error) {
    return {
      sales: "Sin datos",
      orders: "Sin datos",
      customers: "Sin datos",
      pending: "Sin datos",
      error: error.message || "No disponible",
    };
  }
}

function sumByDate(items: Array<Record<string, unknown>>, date: string) {
  return items
    .filter((item) => String(item.date || "").startsWith(date))
    .reduce((acc, item) => acc + Number(item.amount || 0), 0);
}

function countByDate(items: Array<Record<string, unknown>>, date: string) {
  return items.filter((item) => String(item.date || item.createdAt || "").startsWith(date))
    .length;
}

function sumPending(invoices: Array<Record<string, unknown>>) {
  return invoices.reduce((acc, item) => acc + Number(item.balance || 0), 0);
}

function formatCurrency(value: number) {
  return value ? new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(value) : "0";
}

function sumByDateRange(items: Array<Record<string, unknown>>, days: number) {
  const dates = buildDateSet(days);
  return items
    .filter((item) => dates.has(extractDate(item)))
    .reduce((acc, item) => acc + Number(item.amount || 0), 0);
}

function countByDateRange(items: Array<Record<string, unknown>>, days: number) {
  const dates = buildDateSet(days);
  return items.filter((item) => dates.has(extractDate(item))).length;
}

function groupPaymentsByMethod(items: Array<Record<string, unknown>>) {
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

function buildDailySeries(items: Array<Record<string, unknown>>, days: number) {
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

function buildDailyCountSeries(items: Array<Record<string, unknown>>, days: number) {
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

function buildOrdersVsInvoices(
  orders: Array<{ date: string; total: number }>,
  invoices: Array<{ date: string; total: number }>,
  days: number
) {
  const dates = buildDateList(days);
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

function buildDateSet(days: number) {
  return new Set(buildDateList(days));
}

function extractDate(item: Record<string, unknown>) {
  return String(item.date || item.createdAt || item.datetime || "").slice(0, 10);
}

async function buildOrderSeries(days: number) {
  const pool = getPool();
  const orgId = getOrgId();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
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
    GROUP BY 1
    ORDER BY 1
    `,
    [orgId, since]
  );
  return result.rows.map((row) => ({
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
