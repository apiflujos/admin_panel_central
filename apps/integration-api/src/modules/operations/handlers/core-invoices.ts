import type { Request, Response } from "express";

import { normalizeInvoicesListFilters, toAdminWebInvoicesListDto } from "../../../../../../packages/domain/src/invoices";
import { getOrFetchInvoicePdf, listInvoices } from "../../../../../../src/services/invoices.service";

export async function listInvoicesHandler(req: Request, res: Response) {
  try {
    const result = await listInvoices(normalizeInvoicesListFilters(req.query || {}));
    res.json(toAdminWebInvoicesListDto(result));
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
