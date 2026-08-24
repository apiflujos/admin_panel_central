import { getOrgId, getPool } from "../db";

export type OrderInvoiceOverride = {
  orderId: string;
  shopDomain?: string;
  einvoiceRequested: boolean;
  idType?: string;
  idNumber?: string;
  fiscalName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
};

export function validateEinvoiceData(override: OrderInvoiceOverride | null) {
  if (!override || !override.einvoiceRequested) {
    return [];
  }
  const missing: string[] = [];
  if (!override.fiscalName) missing.push("fiscalName");
  if (!override.idType) missing.push("idType");
  if (!override.idNumber) missing.push("idNumber");
  if (!override.email) missing.push("email");
  if (!override.address) missing.push("address");
  if (!override.city) missing.push("city");
  if (!override.state) missing.push("state");
  if (!override.country) missing.push("country");
  return missing;
}

type OverrideRow = {
  order_id: string;
  shop_domain: string;
  einvoice_requested: boolean;
  id_type: string | null;
  id_number: string | null;
  fiscal_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zip: string | null;
};

export const orderOverrideKey = (orderId: string, shopDomain = "") => `${shopDomain}:${orderId}`;

function toOverride(row: OverrideRow): OrderInvoiceOverride {
  return {
    orderId: row.order_id,
    shopDomain: row.shop_domain || undefined,
    einvoiceRequested: Boolean(row.einvoice_requested),
    idType: row.id_type || undefined,
    idNumber: row.id_number || undefined,
    fiscalName: row.fiscal_name || undefined,
    email: row.email || undefined,
    phone: row.phone || undefined,
    address: row.address || undefined,
    city: row.city || undefined,
    state: row.state || undefined,
    country: row.country || undefined,
    zip: row.zip || undefined,
  };
}

export async function getOrderInvoiceOverride(orderId: string, shopDomain = "") {
  const pool = getPool();
  const orgId = getOrgId();
  const result = await pool.query<OverrideRow>(
    `
    SELECT order_id, shop_domain, einvoice_requested, id_type, id_number, fiscal_name, email, phone, address, city, state, country, zip
    FROM order_invoice_overrides
    WHERE organization_id = $1 AND order_id = $2 AND shop_domain = $3
    LIMIT 1
    `,
    [orgId, orderId, shopDomain]
  );
  if (!result.rows.length) return null;
  return toOverride(result.rows[0]);
}

export async function listOrderInvoiceOverrides(orders: Array<string | { orderId: string; shopDomain?: string }>) {
  const pool = getPool();
  const orgId = getOrgId();
  if (!orders.length) return new Map<string, OrderInvoiceOverride>();
  const refs = orders.map((entry) =>
    typeof entry === "string" ? { orderId: entry, shopDomain: "" } : { ...entry, shopDomain: entry.shopDomain || "" }
  );
  const result = await pool.query<OverrideRow>(
    `
    SELECT order_id, shop_domain, einvoice_requested, id_type, id_number, fiscal_name, email, phone, address, city, state, country, zip
    FROM order_invoice_overrides
    WHERE organization_id = $1 AND order_id = ANY($2::text[])
    `,
    [orgId, refs.map((entry) => entry.orderId)]
  );
  const map = new Map<string, OrderInvoiceOverride>();
  result.rows.forEach((row) => map.set(orderOverrideKey(row.order_id, row.shop_domain), toOverride(row)));
  // Compatibilidad para las pantallas de una sola tienda que todavía pasan IDs.
  if (orders.every((entry) => typeof entry === "string")) {
    result.rows.forEach((row) => {
      if (!map.has(row.order_id)) map.set(row.order_id, toOverride(row));
    });
  }
  return map;
}

export async function upsertOrderInvoiceOverride(
  orderId: string,
  payload: OrderInvoiceOverride,
  shopDomain = payload.shopDomain || ""
) {
  const pool = getPool();
  const orgId = getOrgId();
  const data = {
    einvoiceRequested: Boolean(payload.einvoiceRequested),
    idType: payload.idType || null,
    idNumber: payload.idNumber || null,
    fiscalName: payload.fiscalName || null,
    email: payload.email || null,
    phone: payload.phone || null,
    address: payload.address || null,
    city: payload.city || null,
    state: payload.state || null,
    country: payload.country || null,
    zip: payload.zip || null,
  };

  await pool.query(
    `
    INSERT INTO order_invoice_overrides
      (organization_id, shop_domain, order_id, einvoice_requested, id_type, id_number, fiscal_name, email, phone, address, city, state, country, zip, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
    ON CONFLICT (organization_id, shop_domain, order_id)
    DO UPDATE SET
      einvoice_requested = EXCLUDED.einvoice_requested,
      id_type = EXCLUDED.id_type,
      id_number = EXCLUDED.id_number,
      fiscal_name = EXCLUDED.fiscal_name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      address = EXCLUDED.address,
      city = EXCLUDED.city,
      state = EXCLUDED.state,
      country = EXCLUDED.country,
      zip = EXCLUDED.zip,
      updated_at = NOW()
    `,
    [
      orgId,
      shopDomain,
      orderId,
      data.einvoiceRequested,
      data.idType,
      data.idNumber,
      data.fiscalName,
      data.email,
      data.phone,
      data.address,
      data.city,
      data.state,
      data.country,
      data.zip,
    ]
  );
  return { saved: true };
}
