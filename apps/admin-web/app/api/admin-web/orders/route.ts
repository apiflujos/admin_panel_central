import { NextResponse } from "next/server";

import { normalizeOrdersListFilters, toAdminWebOrdersListDto } from "../../../../../../packages/domain/src/orders";
import {
  listOrderInvoiceOverrides,
  validateEinvoiceData,
  type OrderInvoiceOverride,
} from "../../../../../../src/services/order-invoice-overrides.service";
import { listOrders } from "../../../../../../src/services/orders.service";
import { ensureInvoiceSettingsColumns, getOrgId, getPool } from "../../../../../../src/db";
import { routeHandler } from "../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../lib/route-auth";

export const GET = routeHandler(async (req: Request) => {
  await requireRouteAdmin();

  const searchParams = new URL(req.url).searchParams;
  const result = await listOrders(
    normalizeOrdersListFilters({
      shopDomain: searchParams.get("shopDomain") ?? undefined,
      query: searchParams.get("query") ?? undefined,
      date: searchParams.get("date") ?? undefined,
      days: searchParams.get("days") ?? undefined,
      sort: searchParams.get("sort") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    })
  );

  const orderIds = result.items
    .map((row: (typeof result.items)[number]) => row.shopify_order_id)
    .filter(Boolean) as string[];
  const [overrides, einvoiceEnabled, storeNames] = await Promise.all([
    listOrderInvoiceOverrides(orderIds),
    loadEinvoiceEnabled(),
    loadStoreNamesByDomain(),
  ]);

  return NextResponse.json(
    toAdminWebOrdersListDto({
      result,
      getOverride: (shopifyId) => overrides.get(shopifyId) || null,
      getMissing: (_shopifyId, override) =>
        einvoiceEnabled ? validateEinvoiceData((override as OrderInvoiceOverride | null) || null) : [],
      einvoiceEnabled,
      getStoreName: (shopDomain) => storeNames.get(shopDomain.toLowerCase()) || null,
    })
  );
});

// Mapa dominio Shopify -> nombre de tienda (Belia/Becam), para mostrar la tienda
// en la lista de pedidos sin exponer el dominio.
async function loadStoreNamesByDomain(): Promise<Map<string, string>> {
  const pool = getPool();
  const orgId = getOrgId();
  const result = await pool.query<{ shop_domain: string; name: string | null }>(
    `
    SELECT ss.shop_domain, s.name
    FROM shopify_stores ss
    LEFT JOIN stores s ON s.id = ss.store_id AND s.organization_id = ss.organization_id
    WHERE ss.organization_id = $1
    `,
    [orgId]
  );
  const map = new Map<string, string>();
  for (const row of result.rows) {
    if (row.shop_domain && row.name) {
      map.set(String(row.shop_domain).toLowerCase(), String(row.name));
    }
  }
  return map;
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
