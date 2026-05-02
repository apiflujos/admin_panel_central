import type { Request, Response } from "express";

import { normalizeOrdersListFilters, toAdminWebOrdersListDto } from "../../../../../../packages/domain/src/orders";
import {
  listOrderInvoiceOverrides,
  validateEinvoiceData,
  type OrderInvoiceOverride,
} from "../../../../../../src/services/order-invoice-overrides.service";
import { listOrders } from "../../../../../../src/services/orders.service";
import { ensureInvoiceSettingsColumns, getOrgId, getPool } from "../../../../../../src/db";

export async function getAdminWebOrdersHandler(req: Request, res: Response) {
  const result = await listOrders(normalizeOrdersListFilters(req.query || {}));

  const orderIds = result.items.map((row) => row.shopify_order_id).filter(Boolean) as string[];
  const [overrides, einvoiceEnabled] = await Promise.all([listOrderInvoiceOverrides(orderIds), loadEinvoiceEnabled()]);

  const payload = toAdminWebOrdersListDto({
    result,
    getOverride: (shopifyId) => overrides.get(shopifyId) || null,
    getMissing: (_shopifyId, override) => (einvoiceEnabled ? validateEinvoiceData((override as OrderInvoiceOverride | null) || null) : []),
    einvoiceEnabled,
  });

  res.status(200).json(payload);
}

async function loadEinvoiceEnabled() {
  const pool = getPool();
  const orgId = getOrgId();
  await ensureInvoiceSettingsColumns(pool);
  const result = await pool.query<{ einvoice_enabled: boolean | null }>(
    `
    SELECT einvoice_enabled
    FROM invoice_settings
    WHERE organization_id = $1
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId]
  );
  if (!result.rows.length) {
    return false;
  }
  return Boolean(result.rows[0].einvoice_enabled);
}
