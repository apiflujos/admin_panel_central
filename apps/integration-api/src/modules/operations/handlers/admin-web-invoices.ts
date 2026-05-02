import type { Request, Response } from "express";

import { normalizeInvoicesListFilters, toAdminWebInvoicesListDto } from "../../../../../../packages/domain/src/invoices";
import { listInvoices } from "../../../../../../src/services/invoices.service";

export async function getAdminWebInvoicesHandler(req: Request, res: Response) {
  const filters = normalizeInvoicesListFilters(req.query || {});
  const result = await listInvoices(filters);
  res.status(200).json(toAdminWebInvoicesListDto(result));
}
