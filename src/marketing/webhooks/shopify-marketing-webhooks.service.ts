import crypto from "crypto";
import { getOrgId, getPool } from "../../db";
import { inferChannel, parseUtmFromUrl } from "../shopify/shopify-admin-api";

const normalizeShopDomain = (value: unknown) =>
  String(value || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();

const normalizeTimestamp = (value: unknown) => {
  const raw = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw : null;
};

type ShopifyWebhookHeaders = {
  topic: string;
  shopDomain: string;
  webhookId: string;
};

export async function ingestShopifyMarketingWebhook(
  headers: ShopifyWebhookHeaders,
  rawBody: Buffer,
  payload: unknown
) {
  const pool = getPool();
  const orgId = getOrgId();
  const shopDomain = normalizeShopDomain(headers.shopDomain);
  const topic = String(headers.topic || "").trim().toLowerCase();
  const webhookId = String(headers.webhookId || "").trim();
  if (!shopDomain) throw new Error("X-Shopify-Shop-Domain requerido");
  if (!topic) throw new Error("X-Shopify-Topic requerido");
  if (!webhookId) throw new Error("X-Shopify-Webhook-Id requerido");

  const payloadHash = crypto.createHash("sha256").update(rawBody).digest("hex");
  const receipt = await pool.query<{ id: string }>(
    `
    INSERT INTO marketing.webhook_receipts (organization_id, shop_domain, webhook_id, topic, payload_hash, received_at)
    VALUES ($1,$2,$3,$4,$5,NOW())
    ON CONFLICT (organization_id, shop_domain, webhook_id) DO NOTHING
    RETURNING id
    `,
    [orgId, shopDomain, webhookId, topic, payloadHash]
  );
  if (!receipt.rows.length) {
    return { ok: true, deduped: true };
  }

  if (topic === "customers/create") {
    await upsertCustomerFromWebhook(orgId, shopDomain, payload);
  }
  if (topic === "checkouts/create" || topic === "checkouts/update") {
    await ingestCheckoutEvent(orgId, shopDomain, topic, payload);
  }
  if (topic === "orders/create" || topic === "orders/paid") {
    await upsertOrderFromWebhook(orgId, shopDomain, topic, payload);
  }

  await pool.query(
    `
    UPDATE marketing.webhook_receipts
    SET processed_at = NOW()
    WHERE organization_id = $1 AND shop_domain = $2 AND webhook_id = $3
    `,
    [orgId, shopDomain, webhookId]
  );

  return { ok: true, deduped: false };
}

async function upsertCustomerFromWebhook(orgId: number, shopDomain: string, payload: unknown) {
  const pool = getPool();
  const body = (payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {}) as Record<
    string,
    unknown
  >;
  const id = body.id ? String(body.id) : "";
  if (!id) return;
  const email = body.email ? String(body.email).trim().toLowerCase() : null;
  const firstName = body.first_name ? String(body.first_name) : null;
  const lastName = body.last_name ? String(body.last_name) : null;
  const phone = body.phone ? String(body.phone) : null;
  const createdAt = normalizeTimestamp(body.created_at);
  const updatedAt = normalizeTimestamp(body.updated_at);

  await pool.query(
    `
    INSERT INTO marketing.customers
      (organization_id, shop_domain, shopify_customer_gid, email, first_name, last_name, phone, created_at_shopify, updated_at_shopify, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
    ON CONFLICT (organization_id, shop_domain, shopify_customer_gid)
    DO UPDATE SET email = EXCLUDED.email,
                  first_name = EXCLUDED.first_name,
                  last_name = EXCLUDED.last_name,
                  phone = EXCLUDED.phone,
                  updated_at_shopify = COALESCE(EXCLUDED.updated_at_shopify, marketing.customers.updated_at_shopify),
                  updated_at = NOW()
    `,
    [orgId, shopDomain, `gid://shopify/Customer/${id}`, email, firstName, lastName, phone, createdAt, updatedAt]
  );
}

async function ingestCheckoutEvent(orgId: number, shopDomain: string, topic: string, payload: unknown) {
  const pool = getPool();
  const body = (payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {}) as Record<
    string,
    unknown
  >;
  const token = body.token ? String(body.token) : "";
  const createdAt = normalizeTimestamp(body.created_at);
  const updatedAt = normalizeTimestamp(body.updated_at);
  const occurredAt = updatedAt || createdAt || new Date().toISOString();
  const email = body.email ? String(body.email).trim().toLowerCase() : null;
  const landingSite = body.landing_site ? String(body.landing_site) : "";
  const referrer = body.referring_site ? String(body.referring_site) : "";
  const utm = parseUtmFromUrl(landingSite);
  const channel = inferChannel({ utmSource: utm.utm_source, utmMedium: utm.utm_medium, referrer });

  await upsertTrafficSource(orgId, shopDomain, utm, channel);
  await upsertCampaign(orgId, shopDomain, utm);

  await pool.query(
    `
    INSERT INTO marketing.attribution_events
      (organization_id, shop_domain, event_type, occurred_at, shopify_checkout_token, customer_email, landing_site, referrer, utm_source, utm_medium, utm_campaign, utm_content, inferred_channel, metadata)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    `,
    [
      orgId,
      shopDomain,
      topic === "checkouts/create" ? "checkout_created" : "checkout_updated",
      occurredAt,
      token || null,
      email,
      landingSite || null,
      referrer || null,
      utm.utm_source,
      utm.utm_medium,
      utm.utm_campaign,
      utm.utm_content,
      channel,
      body || {},
    ]
  );
}

async function upsertOrderFromWebhook(orgId: number, shopDomain: string, topic: string, payload: unknown) {
  const pool = getPool();
  const body = (payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {}) as Record<
    string,
    unknown
  >;
  const id = body.id ? String(body.id) : "";
  if (!id) return;
  const orderGid = `gid://shopify/Order/${id}`;
  const createdAt = normalizeTimestamp(body.created_at);
  const processedAt = normalizeTimestamp(body.processed_at);
  const financialStatus = body.financial_status ? String(body.financial_status) : null;
  const totalAmount = body.total_price ? Number(body.total_price) : null;
  const currency = body.currency ? String(body.currency) : null;
  const email = body.email ? String(body.email).trim().toLowerCase() : null;
  const orderName = body.name ? String(body.name) : null;
  const landingSite = body.landing_site ? String(body.landing_site) : "";
  const referrer = body.referring_site ? String(body.referring_site) : "";
  const utm = parseUtmFromUrl(landingSite);
  const sourceName = body.source_name ? String(body.source_name) : null;
  const channel = inferChannel({ utmSource: utm.utm_source, utmMedium: utm.utm_medium, referrer, sourceName });

  await upsertTrafficSource(orgId, shopDomain, utm, channel);
  await upsertCampaign(orgId, shopDomain, utm);

  const tags = typeof body.tags === "string" ? body.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
  const discountCodes = Array.isArray(body.discount_codes)
    ? (body.discount_codes as Array<Record<string, unknown>>).map((d) => String(d.code || "")).filter(Boolean)
    : [];

  await pool.query(
    `
    INSERT INTO marketing.orders
      (organization_id, shop_domain, shopify_order_gid, order_name, created_at_shopify, processed_at_shopify, financial_status, total_amount, currency, customer_email,
       discount_codes, tags, landing_site, referrer, utm_source, utm_medium, utm_campaign, utm_content, inferred_channel, raw_json, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,NOW())
    ON CONFLICT (organization_id, shop_domain, shopify_order_gid)
    DO UPDATE SET processed_at_shopify = COALESCE(EXCLUDED.processed_at_shopify, marketing.orders.processed_at_shopify),
                  financial_status = COALESCE(EXCLUDED.financial_status, marketing.orders.financial_status),
                  total_amount = COALESCE(EXCLUDED.total_amount, marketing.orders.total_amount),
                  currency = COALESCE(EXCLUDED.currency, marketing.orders.currency),
                  customer_email = COALESCE(EXCLUDED.customer_email, marketing.orders.customer_email),
                  discount_codes = COALESCE(EXCLUDED.discount_codes, marketing.orders.discount_codes),
                  tags = COALESCE(EXCLUDED.tags, marketing.orders.tags),
                  landing_site = COALESCE(EXCLUDED.landing_site, marketing.orders.landing_site),
                  referrer = COALESCE(EXCLUDED.referrer, marketing.orders.referrer),
                  utm_source = COALESCE(EXCLUDED.utm_source, marketing.orders.utm_source),
                  utm_medium = COALESCE(EXCLUDED.utm_medium, marketing.orders.utm_medium),
                  utm_campaign = COALESCE(EXCLUDED.utm_campaign, marketing.orders.utm_campaign),
                  utm_content = COALESCE(EXCLUDED.utm_content, marketing.orders.utm_content),
                  inferred_channel = COALESCE(EXCLUDED.inferred_channel, marketing.orders.inferred_channel),
                  raw_json = EXCLUDED.raw_json,
                  updated_at = NOW()
    `,
    [
      orgId,
      shopDomain,
      orderGid,
      orderName,
      createdAt,
      processedAt,
      financialStatus,
      totalAmount,
      currency,
      email,
      discountCodes.length ? discountCodes : null,
      tags.length ? tags : null,
      landingSite || null,
      referrer || null,
      utm.utm_source,
      utm.utm_medium,
      utm.utm_campaign,
      utm.utm_content,
      channel,
      body || {},
    ]
  );

  await pool.query(
    `
    INSERT INTO marketing.attribution_events
      (organization_id, shop_domain, event_type, occurred_at, shopify_order_gid, customer_email, landing_site, referrer, utm_source, utm_medium, utm_campaign, utm_content, inferred_channel, value_amount, currency, metadata)
    VALUES ($1,$2,$3,COALESCE($4, NOW()),$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
    `,
    [
      orgId,
      shopDomain,
      topic === "orders/paid" ? "order_paid" : "order_created",
      processedAt || createdAt,
      orderGid,
      email,
      landingSite || null,
      referrer || null,
      utm.utm_source,
      utm.utm_medium,
      utm.utm_campaign,
      utm.utm_content,
      channel,
      totalAmount,
      currency,
      { discountCodes, tags, financialStatus },
    ]
  );

  const lineItems = Array.isArray(body.line_items) ? (body.line_items as Array<Record<string, unknown>>) : [];
  if (lineItems.length) {
    await pool.query(
      `DELETE FROM marketing.order_items WHERE organization_id = $1 AND shop_domain = $2 AND shopify_order_gid = $3`,
      [orgId, shopDomain, orderGid]
    );
    for (const li of lineItems.slice(0, 250)) {
      const title = li.title ? String(li.title) : "";
      const qty = li.quantity ? Number(li.quantity) : 0;
      const price = li.price ? Number(li.price) : null;
      const lineAmount = Number.isFinite(price as number) ? Number(price) * Math.max(0, qty) : null;
      const productId = li.product_id ? `gid://shopify/Product/${String(li.product_id)}` : null;
      await pool.query(
        `
        INSERT INTO marketing.order_items
          (organization_id, shop_domain, shopify_order_gid, shopify_product_gid, product_title, quantity, unit_price, line_amount)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        `,
        [orgId, shopDomain, orderGid, productId, title || null, qty, price, lineAmount]
      );
    }
  }
}

async function upsertTrafficSource(
  orgId: number,
  shopDomain: string,
  utm: { utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; utm_content: string | null },
  channel: string
) {
  const pool = getPool();
  const utmSource = utm.utm_source || "direct";
  const utmMedium = utm.utm_medium || "none";
  await pool.query(
    `
    INSERT INTO marketing.traffic_sources (organization_id, shop_domain, utm_source, utm_medium, channel, updated_at)
    VALUES ($1,$2,$3,$4,$5,NOW())
    ON CONFLICT (organization_id, shop_domain, utm_source, utm_medium)
    DO UPDATE SET channel = EXCLUDED.channel, updated_at = NOW()
    `,
    [orgId, shopDomain, utmSource, utmMedium, channel]
  );
}

async function upsertCampaign(
  orgId: number,
  shopDomain: string,
  utm: { utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; utm_content: string | null }
) {
  const pool = getPool();
  const utmCampaign = String(utm.utm_campaign || "").trim();
  if (!utmCampaign) return;
  const utmSource = String(utm.utm_source || "").trim();
  const utmMedium = String(utm.utm_medium || "").trim();
  const utmContent = String(utm.utm_content || "").trim();

  await pool.query(
    `
    INSERT INTO marketing.campaigns (organization_id, shop_domain, utm_source, utm_medium, utm_campaign, utm_content, name, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
    ON CONFLICT (organization_id, shop_domain, utm_campaign, utm_source, utm_medium, utm_content)
    DO UPDATE SET updated_at = NOW()
    `,
    [orgId, shopDomain, utmSource, utmMedium, utmCampaign, utmContent, utmCampaign]
  );
}
