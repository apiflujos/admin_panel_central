import type { Request, Response } from "express";
import { getOrFetchInvoicePdf, listInvoices } from "../services/invoices.service";

export async function listInvoicesHandler(req: Request, res: Response) {
  try {
    const shopDomain = typeof req.query.shopDomain === "string" ? req.query.shopDomain.trim() : "";
    const query = typeof req.query.query === "string" ? req.query.query.trim() : "";
    const date = typeof req.query.date === "string" ? req.query.date : "";
    const days = Number(req.query.days || 0);
    const sort = typeof req.query.sort === "string" ? req.query.sort : "date_desc";
    const limit = Number(req.query.limit || 20);
    const offset = Number(req.query.offset || 0);

    const result = await listInvoices({
      shopDomain: shopDomain || undefined,
      query: query || undefined,
      date: date || undefined,
      days: Number.isFinite(days) && days > 0 ? days : undefined,
      sort,
      limit: Number.isFinite(limit) && limit > 0 ? limit : 20,
      offset: Number.isFinite(offset) && offset > 0 ? offset : 0,
    });

    const items = result.items.map((row) => {
      const invoiceId = row.alegra_invoice_id ? String(row.alegra_invoice_id) : "";
      const customer = row.customer_name || row.customer_email || "-";
      return {
        id: invoiceId,
        invoiceId,
        invoiceNumber: row.invoice_number || null,
        processedAt: row.processed_at || row.updated_at,
        customer,
        total: row.total ?? null,
        currency: row.currency ?? null,
        status: row.alegra_status || row.status || null,
      };
    });

    res.json({ items, total: result.total, limit: result.limit, offset: result.offset });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Invoices list error" });
  }
}

export async function downloadInvoicePdfHandler(req: Request, res: Response) {
  try {
    const invoiceId = String(req.params.invoiceId || "").trim();
    const shopDomain = typeof req.query.shopDomain === "string" ? String(req.query.shopDomain) : "";
    const result = await getOrFetchInvoicePdf(invoiceId, shopDomain);
    const filenameBase = (result.invoiceNumber || invoiceId || "factura").replace(/[^\w.-]+/g, "_");
    res.setHeader("Content-Type", result.contentType || "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filenameBase}.pdf"`);
    res.status(200).send(result.content);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invoice pdf error" });
  }
}

