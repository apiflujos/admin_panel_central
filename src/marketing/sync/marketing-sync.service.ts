import { getPool } from "../../db";
import { ensureMarketingShop, getSyncCursor, setSyncCursor } from "../db/marketing.repository";
import { getMarketingShopifyClient } from "../shopify/shopify.service";
import { inferChannel, parseUtmFromUrl } from "../shopify/shopify-admin-api";

type SyncOptions = {
  sinceDate?: string; // YYYY-MM-DD
  maxOrders?: number;
};

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function safeDateKey(input: unknown) {
  const raw = String(input || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
}

function normalizeTimestamp(input: unknown) {
  const raw = String(input || "").trim();
  return /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw : null;
}

export async function syncMarketingOrders(shopDomain: string, options: SyncOptions = {}) {
  const pool = getPool();
  const { organizationId, shopDomain: domain } = await ensureMarketingShop(shopDomain);
  const client = await getMarketingShopifyClient(domain);

  const stored = await getSyncCursor(domain, "orders_since");
  const since =
    safeDateKey(options.sinceDate) ||
    safeDateKey(stored) ||
    formatDateKey(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const maxOrders = Math.max(50, Number(options.maxOrders || process.env.MARKETING_SYNC_MAX_ORDERS || 1500));

  const query = `status:any processed_at:>='${since}'`;
  let cursor: string | null = null;
  let hasNext = true;
  let processed = 0;
  let latestDate = since;
  const seenTraffic = new Set<string>();
  const seenCampaigns = new Set<string>();
  let usedMinimal = false;

  while (hasNext && processed < maxOrders) {
    let page: Awaited<ReturnType<typeof client.gqlOrdersPaged>>;
    try {
      page = await client.gqlOrdersPaged({ query, cursor });
    } catch (error) {
      // Fallback: some Shopify stores / API versions may not support journey/source fields.
      usedMinimal = true;
      page = (await client.gqlOrdersPagedMinimal({ query, cursor })) as any;
    }
    for (const edge of page.edges || []) {
      const node = edge.node;
      const orderGid = String(node.id || "");
      if (!orderGid) continue;
      const createdAt = normalizeTimestamp(node.createdAt);
      const processedAt = normalizeTimestamp(node.processedAt);
      const financial = node.displayFinancialStatus || null;
      const amount = Number(node.totalPriceSet?.shopMoney?.amount || 0);
      const currency = node.totalPriceSet?.shopMoney?.currencyCode || null;
      const customerGid = node.customer?.id || null;
      const email = node.customer?.email || null;
      const journey = (node as any)?.customerJourneySummary || null;
      const lastVisit = journey?.lastVisit || null;
      const firstVisit = journey?.firstVisit || null;
      const landingSite = String(
        lastVisit?.landingPage ||
          firstVisit?.landingPage ||
          (node as any)?.registeredSourceUrl ||
          ""
      ).trim();
      const referrer = String(lastVisit?.referrerUrl || firstVisit?.referrerUrl || "").trim();

      const fromParams = (visit: any) => {
        const params = visit?.utmParameters || null;
        if (!params) return null;
        const pick = (value: unknown) => {
          const trimmed = String(value ?? "").trim();
          return trimmed ? trimmed : null;
        };
        const utm_source = pick(params.source);
        const utm_medium = pick(params.medium);
        const utm_campaign = pick(params.campaign);
        const utm_content = pick(params.content);
        if (!utm_source && !utm_medium && !utm_campaign && !utm_content) return null;
        return { utm_source, utm_medium, utm_campaign, utm_content };
      };
      const utm =
        fromParams(lastVisit) ||
        fromParams(firstVisit) ||
        parseUtmFromUrl(landingSite);
      const channel = inferChannel({
        utmSource: utm.utm_source,
        utmMedium: utm.utm_medium,
        referrer,
        sourceName: node.sourceName || null,
      });

      const trafficUtmSource = utm.utm_source || "direct";
      const trafficUtmMedium = utm.utm_medium || "none";
      const trafficKey = `${trafficUtmSource}|${trafficUtmMedium}|${channel}`;
      if (!seenTraffic.has(trafficKey)) {
        seenTraffic.add(trafficKey);
        await pool.query(
          `
          INSERT INTO marketing.traffic_sources (organization_id, shop_domain, utm_source, utm_medium, channel, updated_at)
          VALUES ($1,$2,$3,$4,$5,NOW())
          ON CONFLICT (organization_id, shop_domain, utm_source, utm_medium)
          DO UPDATE SET channel = EXCLUDED.channel, updated_at = NOW()
          `,
          [organizationId, domain, trafficUtmSource, trafficUtmMedium, channel]
        );
      }

      const campaign = String(utm.utm_campaign || "").trim();
      if (campaign) {
        const source = String(utm.utm_source || "").trim();
        const medium = String(utm.utm_medium || "").trim();
        const content = String(utm.utm_content || "").trim();
        const campaignKey = `${campaign}|${source}|${medium}|${content}`;
        if (!seenCampaigns.has(campaignKey)) {
          seenCampaigns.add(campaignKey);
          await pool.query(
            `
            INSERT INTO marketing.campaigns (organization_id, shop_domain, utm_source, utm_medium, utm_campaign, utm_content, name, updated_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
            ON CONFLICT (organization_id, shop_domain, utm_campaign, utm_source, utm_medium, utm_content)
            DO UPDATE SET updated_at = NOW()
            `,
            [organizationId, domain, source, medium, campaign, content, campaign]
          );
        }
      }
      const tags = Array.isArray(node.tags) ? node.tags.map((t) => String(t || "")).filter(Boolean) : [];

      await pool.query(
        `
        INSERT INTO marketing.orders
          (organization_id, shop_domain, shopify_order_gid, order_name, created_at_shopify, processed_at_shopify,
           financial_status, total_amount, currency, customer_gid, customer_email, discount_codes, tags,
           landing_site, referrer, utm_source, utm_medium, utm_campaign, utm_content, inferred_channel, raw_json, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,NOW())
        ON CONFLICT (organization_id, shop_domain, shopify_order_gid)
        DO UPDATE SET processed_at_shopify = COALESCE(EXCLUDED.processed_at_shopify, marketing.orders.processed_at_shopify),
                      financial_status = COALESCE(EXCLUDED.financial_status, marketing.orders.financial_status),
                      total_amount = COALESCE(EXCLUDED.total_amount, marketing.orders.total_amount),
                      currency = COALESCE(EXCLUDED.currency, marketing.orders.currency),
                      customer_gid = COALESCE(EXCLUDED.customer_gid, marketing.orders.customer_gid),
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
          organizationId,
          domain,
          orderGid,
          orderGid,
          createdAt,
          processedAt,
          financial,
          Number.isFinite(amount) ? amount : null,
          currency,
          customerGid,
          email,
          null,
          tags.length ? tags : null,
          landingSite || null,
          referrer || null,
          utm.utm_source,
          utm.utm_medium,
          utm.utm_campaign,
          utm.utm_content,
          channel,
          node as unknown as Record<string, unknown>,
        ]
      );

      await pool.query(
        `DELETE FROM marketing.order_items WHERE organization_id = $1 AND shop_domain = $2 AND shopify_order_gid = $3`,
        [organizationId, domain, orderGid]
      );
      const lineEdges = node.lineItems?.edges || [];
      for (const liEdge of lineEdges) {
        const li = liEdge.node;
        const qty = Number(li.quantity || 0);
        const title = String(li.product?.title || li.title || "").trim();
        const productGid = li.product?.id || null;
        const unit = Number(li.discountedUnitPriceSet?.shopMoney?.amount || li.originalUnitPriceSet?.shopMoney?.amount || 0);
        const lineAmount = Number.isFinite(unit) ? unit * Math.max(0, qty) : null;
        await pool.query(
          `
          INSERT INTO marketing.order_items
            (organization_id, shop_domain, shopify_order_gid, shopify_product_gid, product_title, quantity, unit_price, line_amount)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          `,
          [organizationId, domain, orderGid, productGid, title || null, qty, Number.isFinite(unit) ? unit : null, lineAmount]
        );
      }

      const date = safeDateKey(processedAt || createdAt || "");
      if (date && date > latestDate) {
        latestDate = date;
      }
      processed += 1;
      if (processed >= maxOrders) break;
    }

    hasNext = Boolean(page.pageInfo?.hasNextPage);
    cursor = page.pageInfo?.endCursor || null;
    if (!cursor) hasNext = false;
  }

  await setSyncCursor(domain, "orders_since", latestDate);
  return { shopDomain: domain, since, processed, latestDate, maxOrders, usedMinimal };
}
