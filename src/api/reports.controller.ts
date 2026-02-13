import type { Request, Response } from "express";
import { getOrgId, getPool } from "../db";
import { getMetrics, type MetricsRange } from "../services/metrics.service";

type ReportType =
  | "orders"
  | "invoices"
  | "top_products_revenue"
  | "top_products_units"
  | "repeat_customers"
  | "dead_stock";

const normalizeShopDomain = (value: unknown) =>
  String(value || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();

function isMetricsRange(value: unknown): value is MetricsRange {
  return value === "day" || value === "week" || value === "month";
}

function normalizeReportType(value: unknown): ReportType {
  const raw = String(value || "").trim().toLowerCase();
  if (
    raw === "orders" ||
    raw === "invoices" ||
    raw === "top_products_revenue" ||
    raw === "top_products_units" ||
    raw === "repeat_customers" ||
    raw === "dead_stock"
  ) {
    return raw as ReportType;
  }
  return "orders";
}

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  const escaped = text.replace(/"/g, '""');
  return `"${escaped}"`;
}

function csvRow(values: unknown[]) {
  return `${values.map(csvCell).join(",")}\r\n`;
}

function asRangeDates(rangeFrom: string, rangeTo: string) {
  const from = new Date(`${rangeFrom}T00:00:00.000Z`);
  const to = new Date(`${rangeTo}T23:59:59.999Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error("Rango inválido para reportes.");
  }
  return { from, to };
}

export async function downloadCommerceReportCsvHandler(req: Request, res: Response) {
  try {
    const range = isMetricsRange(req.query.range) ? (req.query.range as MetricsRange) : "month";
    const shopDomain = normalizeShopDomain(req.query.shopDomain);
    const type = normalizeReportType(req.query.type);

    const metrics = await getMetrics({ range, shopDomain: shopDomain || undefined });
    const { from, to } = asRangeDates(String(metrics.rangeFrom || ""), String(metrics.rangeTo || ""));

    const filenameShop = shopDomain ? `_${shopDomain.replace(/[^\w.-]+/g, "_")}` : "";
    const filename = `reporte_${type}${filenameShop}_${metrics.rangeFrom}_${metrics.rangeTo}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // BOM para Excel
    let out = "\ufeff";

    if (type === "orders") {
      const pool = getPool();
      const orgId = getOrgId();
      const result = await pool.query<{
        processed_at: string | null;
        created_at: string;
        shopify_order_number: string | null;
        customer_name: string | null;
        customer_email: string | null;
        total: string | number | null;
        currency: string | null;
        status: string | null;
        invoice_number: string | null;
      }>(
        `
        SELECT
          processed_at,
          created_at,
          shopify_order_number,
          customer_name,
          customer_email,
          total,
          currency,
          status,
          invoice_number
        FROM orders
        WHERE organization_id = $1
          AND source = 'shopify'
          AND COALESCE(processed_at, created_at) >= $2
          AND COALESCE(processed_at, created_at) <= $3
          AND ($4 = '' OR shop_domain = $4)
        ORDER BY COALESCE(processed_at, created_at) DESC
        `,
        [orgId, from.toISOString(), to.toISOString(), shopDomain]
      );

      out += csvRow(["Fecha", "Pedido", "Cliente", "Email", "Total", "Moneda", "Estado", "Factura"]);
      for (const row of result.rows) {
        const date = String(row.processed_at || row.created_at || "").slice(0, 10);
        out += csvRow([
          date,
          row.shopify_order_number || "",
          row.customer_name || "",
          row.customer_email || "",
          row.total ?? "",
          row.currency || "",
          row.status || "",
          row.invoice_number || "",
        ]);
      }
      res.status(200).send(out);
      return;
    }

    if (type === "invoices") {
      const pool = getPool();
      const orgId = getOrgId();
      const result = await pool.query<{
        processed_at: string | null;
        updated_at: string;
        invoice_number: string | null;
        customer_name: string | null;
        customer_email: string | null;
        total: string | number | null;
        currency: string | null;
        alegra_status: string | null;
      }>(
        `
        SELECT
          processed_at,
          updated_at,
          invoice_number,
          customer_name,
          customer_email,
          total,
          currency,
          alegra_status
        FROM orders
        WHERE organization_id = $1
          AND alegra_invoice_id IS NOT NULL
          AND NULLIF(alegra_invoice_id, '') IS NOT NULL
          AND COALESCE(processed_at, updated_at) >= $2
          AND COALESCE(processed_at, updated_at) <= $3
          AND ($4 = '' OR shop_domain = $4)
        ORDER BY COALESCE(processed_at, updated_at) DESC
        `,
        [orgId, from.toISOString(), to.toISOString(), shopDomain]
      );

      out += csvRow(["Fecha", "Factura", "Cliente", "Email", "Total", "Moneda", "Estado"]);
      for (const row of result.rows) {
        const date = String(row.processed_at || row.updated_at || "").slice(0, 10);
        out += csvRow([
          date,
          row.invoice_number || "",
          row.customer_name || "",
          row.customer_email || "",
          row.total ?? "",
          row.currency || "",
          row.alegra_status || "",
        ]);
      }
      res.status(200).send(out);
      return;
    }

    if (type === "top_products_revenue") {
      const items = Array.isArray(metrics.topProductsRevenue) ? metrics.topProductsRevenue : [];
      out += csvRow(["Producto", "Unidades", "Total"]);
      items.forEach((item) => {
        out += csvRow([item.name || "", item.units ?? "", item.amount ?? ""]);
      });
      res.status(200).send(out);
      return;
    }

    if (type === "top_products_units") {
      const items = Array.isArray(metrics.topProductsUnits) ? metrics.topProductsUnits : [];
      out += csvRow(["Producto", "Unidades"]);
      items.forEach((item) => {
        out += csvRow([item.name || "", item.units ?? ""]);
      });
      res.status(200).send(out);
      return;
    }

    if (type === "repeat_customers") {
      const items = Array.isArray(metrics.repeatCustomers) ? metrics.repeatCustomers : [];
      out += csvRow(["Cliente", "Email", "Pedidos", "Total", "TicketPromedio"]);
      items.forEach((item) => {
        out += csvRow([
          item.name || "",
          item.email || "",
          item.count ?? "",
          item.total ?? "",
          item.avgTicket ?? "",
        ]);
      });
      res.status(200).send(out);
      return;
    }

    // dead_stock
    const items = Array.isArray(metrics.inactiveProducts) ? metrics.inactiveProducts : [];
    out += csvRow(["Producto", "Stock", "VentasVentanaDias"]);
    items.forEach((item) => {
      out += csvRow([item.name || "", item.stock ?? "", item.windowDays ?? ""]);
    });
    res.status(200).send(out);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Reporte no disponible" });
  }
}

