import { getOrgId, getPool } from "../db";
import { getAlegraCredential } from "./settings.service";
import { AlegraClient } from "../connectors/alegra";
import { getAlegraBaseUrl } from "../utils/alegra-env";

const normalizeShopDomain = (value: unknown) =>
  String(value || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();

export async function listInvoices(options: {
  shopDomain?: string;
  query?: string;
  date?: string;
  days?: number;
  sort?: string;
  limit?: number;
  offset?: number;
}) {
  const pool = getPool();
  const orgId = getOrgId();
  const where: string[] = [
    "organization_id = $1",
    "alegra_invoice_id IS NOT NULL",
    "NULLIF(alegra_invoice_id, '') IS NOT NULL",
  ];
  const params: Array<string | number | null> = [orgId];
  let idx = 2;

  const add = (clause: string, value: string | number | null) => {
    where.push(clause.replace("$idx", `$${idx}`));
    params.push(value);
    idx += 1;
  };

  if (typeof options.shopDomain === "string") {
    add("shop_domain = $idx", normalizeShopDomain(options.shopDomain));
  }
  if (options.query) {
    const q = `%${options.query}%`;
    where.push(
      `(invoice_number ILIKE $${idx} OR shopify_order_number ILIKE $${idx} OR customer_name ILIKE $${idx} OR customer_email ILIKE $${idx})`
    );
    params.push(q);
    idx += 1;
  }
  if (options.date) {
    add("COALESCE(processed_at, updated_at)::date = $idx::date", options.date);
  }
  if (options.days && options.days > 0) {
    const cutoff = new Date(Date.now() - options.days * 24 * 60 * 60 * 1000).toISOString();
    add("COALESCE(processed_at, updated_at) >= $idx", cutoff);
  }

  const limit = Number.isFinite(options.limit) && Number(options.limit) > 0 ? Number(options.limit) : 20;
  const offset = Number.isFinite(options.offset) && Number(options.offset) >= 0 ? Number(options.offset) : 0;

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const countResult = await pool.query<{ total: string }>(
    `
    SELECT COUNT(*)::text AS total
    FROM orders
    ${whereClause}
    `,
    params
  );

  const sort = String(options.sort || "date_desc");
  let orderBy = "COALESCE(processed_at, updated_at) DESC NULLS LAST";
  if (sort === "date_asc") orderBy = "COALESCE(processed_at, updated_at) ASC NULLS LAST";
  if (sort === "order_asc") orderBy = "invoice_number ASC NULLS LAST";
  if (sort === "order_desc") orderBy = "invoice_number DESC NULLS LAST";

  const items = await pool.query(
    `
    SELECT alegra_invoice_id,
           invoice_number,
           customer_name,
           customer_email,
           processed_at,
           status,
           total,
           currency,
           alegra_status,
           updated_at
    FROM orders
    ${whereClause}
    ORDER BY ${orderBy}
    LIMIT $${idx} OFFSET $${idx + 1}
    `,
    [...params, limit, offset]
  );

  return {
    items: items.rows,
    total: Number(countResult.rows[0]?.total || 0),
    limit,
    offset,
  };
}

export async function getOrFetchInvoicePdf(alegraInvoiceId: string, shopDomain?: string) {
  const pool = getPool();
  const orgId = getOrgId();
  const invoiceId = String(alegraInvoiceId || "").trim();
  if (!invoiceId) {
    throw new Error("invoiceId requerido.");
  }

  const existing = await pool.query<{
    content_type: string | null;
    content: Buffer;
    invoice_number: string | null;
  }>(
    `
    SELECT content_type, content, invoice_number
    FROM invoice_documents
    WHERE organization_id = $1 AND alegra_invoice_id = $2
    LIMIT 1
    `,
    [orgId, invoiceId]
  );
  if (existing.rows.length) {
    return {
      contentType: existing.rows[0].content_type || "application/pdf",
      content: existing.rows[0].content,
      invoiceNumber: existing.rows[0].invoice_number || null,
    };
  }

  const invoiceNumberResult = await pool.query<{ invoice_number: string | null }>(
    `
    SELECT invoice_number
    FROM orders
    WHERE organization_id = $1 AND alegra_invoice_id = $2
    ORDER BY updated_at DESC
    LIMIT 1
    `,
    [orgId, invoiceId]
  );
  const invoiceNumber = invoiceNumberResult.rows[0]?.invoice_number || null;

  const alegraCredential = await getAlegraCredential();
  const baseUrl = getAlegraBaseUrl(alegraCredential.environment || "prod");
  const client = new AlegraClient({
    email: alegraCredential.email,
    apiKey: alegraCredential.apiKey,
    baseUrl,
  });
  const pdf = await client.getInvoicePdf(invoiceId);

  const normalizedShopDomain = shopDomain ? normalizeShopDomain(shopDomain) : "";
  await pool.query(
    `
    INSERT INTO invoice_documents
      (organization_id, shop_domain, alegra_invoice_id, invoice_number, content_type, content, fetched_at, created_at, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW(),NOW())
    ON CONFLICT (organization_id, alegra_invoice_id)
    DO UPDATE SET content_type = EXCLUDED.content_type,
                  content = EXCLUDED.content,
                  invoice_number = COALESCE(EXCLUDED.invoice_number, invoice_documents.invoice_number),
                  shop_domain = COALESCE(NULLIF(EXCLUDED.shop_domain, ''), invoice_documents.shop_domain),
                  fetched_at = NOW(),
                  updated_at = NOW()
    `,
    [orgId, normalizedShopDomain, invoiceId, invoiceNumber, pdf.contentType, pdf.content]
  );

  return { ...pdf, invoiceNumber };
}

