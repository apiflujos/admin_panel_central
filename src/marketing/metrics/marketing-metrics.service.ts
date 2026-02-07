import { getOrgId, getPool } from "../../db";
import { ensureMarketingShop } from "../db/marketing.repository";

const normalizeShopDomain = (value: unknown) =>
  String(value || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();

function asDateKey(value: string) {
  const raw = String(value || "").slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return "";
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function recomputeDailyMarketingMetrics(input: {
  shopDomain: string;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}) {
  const pool = getPool();
  const orgId = getOrgId();
  const shopDomain = normalizeShopDomain(input.shopDomain);
  const fromKey = asDateKey(input.from);
  const toKey = asDateKey(input.to);
  if (!shopDomain) throw new Error("shopDomain requerido");
  if (!fromKey || !toKey) throw new Error("Rango inválido (from/to)");

  await ensureMarketingShop(shopDomain);

  const fromDate = new Date(`${fromKey}T00:00:00.000Z`);
  const toDate = new Date(`${toKey}T00:00:00.000Z`);

  const safeOrderDateSql = `
    COALESCE(
      CASE
        WHEN processed_at_shopify::text ~ '^\\d{4}-\\d{2}-\\d{2}' THEN processed_at_shopify::timestamptz
        ELSE NULL
      END,
      CASE
        WHEN created_at_shopify::text ~ '^\\d{4}-\\d{2}-\\d{2}' THEN created_at_shopify::timestamptz
        ELSE NULL
      END,
      created_at
    )::date
  `;
  const safeSpendDateSql = `
    CASE
      WHEN date::text ~ '^\\d{4}-\\d{2}-\\d{2}' THEN date::date
      ELSE NULL
    END
  `;
  const safeEventDateSql = `
    CASE
      WHEN occurred_at::text ~ '^\\d{4}-\\d{2}-\\d{2}' THEN occurred_at::date
      ELSE NULL
    END
  `;

  // Clear existing metrics for range (idempotent recompute).
  await pool.query(
    `
    DELETE FROM marketing.daily_metrics
    WHERE organization_id = $1 AND shop_domain = $2 AND date >= $3::date AND date <= $4::date
    `,
    [orgId, shopDomain, fromKey, toKey]
  );

  // Sessions / AddToCart / Checkouts from events (pixel + checkout webhooks).
  const eventsAgg = await pool.query<{
    date: string;
    channel: string;
    utm_campaign: string | null;
    sessions: string;
    add_to_cart: string;
    checkouts: string;
  }>(
    `
    SELECT
      ${safeEventDateSql} AS date,
      COALESCE(NULLIF(inferred_channel,''), 'unknown') AS channel,
      NULLIF(utm_campaign,'') AS utm_campaign,
      COUNT(*) FILTER (WHERE event_type = 'session')::text AS sessions,
      COUNT(*) FILTER (WHERE event_type = 'add_to_cart')::text AS add_to_cart,
      COUNT(*) FILTER (WHERE event_type IN ('checkout_created','checkout_updated'))::text AS checkouts
    FROM marketing.attribution_events
    WHERE organization_id = $1
      AND shop_domain = $2
      AND ${safeEventDateSql} >= $3::date
      AND ${safeEventDateSql} <= $4::date
    GROUP BY ${safeEventDateSql}, channel, utm_campaign
    `,
    [orgId, shopDomain, fromKey, toKey]
  );

  // Paid orders + revenue from orders table.
  const paidAgg = await pool.query<{
    date: string;
    channel: string;
    utm_campaign: string | null;
    paid_orders: string;
    revenue: string;
    customers: string;
  }>(
    `
    SELECT
      ${safeOrderDateSql} AS date,
      COALESCE(NULLIF(inferred_channel,''), 'unknown') AS channel,
      NULLIF(utm_campaign,'') AS utm_campaign,
      COUNT(*)::text AS paid_orders,
      COALESCE(SUM(COALESCE(total_amount,0)),0)::text AS revenue,
      COUNT(DISTINCT NULLIF(customer_email,''))::text AS customers
    FROM marketing.orders
    WHERE organization_id = $1
      AND shop_domain = $2
      AND ${safeOrderDateSql} >= $3::date
      AND ${safeOrderDateSql} <= $4::date
      AND LOWER(COALESCE(financial_status,'')) IN ('paid','partially_paid','authorized')
    GROUP BY date, channel, utm_campaign
    `,
    [orgId, shopDomain, fromKey, toKey]
  );

  // Spend per campaign/day (optional).
  const spendAgg = await pool.query<{
    date: string;
    utm_campaign: string;
    amount: string;
  }>(
    `
    SELECT ${safeSpendDateSql}::text AS date, utm_campaign, COALESCE(SUM(amount),0)::text AS amount
    FROM marketing.campaign_spend
    WHERE organization_id = $1
      AND shop_domain = $2
      AND ${safeSpendDateSql} >= $3::date
      AND ${safeSpendDateSql} <= $4::date
    GROUP BY ${safeSpendDateSql}, utm_campaign
    `,
    [orgId, shopDomain, fromKey, toKey]
  );
  const spendKey = new Map(spendAgg.rows.map((r) => [`${r.date}|${r.utm_campaign}`, Number(r.amount || 0)]));

  // New vs repeat customers (per day) computed globally, independent of channel (we’ll allocate to unknown).
  const newRepeat = await pool.query<{
    date: string;
    new_customers: string;
    repeat_customers: string;
  }>(
    `
    WITH paid AS (
      SELECT
        ${safeOrderDateSql} AS date,
        NULLIF(customer_email,'') AS email
      FROM marketing.orders
      WHERE organization_id = $1
        AND shop_domain = $2
        AND LOWER(COALESCE(financial_status,'')) IN ('paid','partially_paid','authorized')
        AND NULLIF(customer_email,'') IS NOT NULL
    ),
    first_paid AS (
      SELECT email, MIN(date) AS first_date
      FROM paid
      GROUP BY email
    )
    SELECT
      p.date::text AS date,
      COUNT(DISTINCT p.email) FILTER (WHERE f.first_date = p.date)::text AS new_customers,
      COUNT(DISTINCT p.email) FILTER (WHERE f.first_date < p.date)::text AS repeat_customers
    FROM paid p
    JOIN first_paid f ON f.email = p.email
    WHERE p.date >= $3::date AND p.date <= $4::date
    GROUP BY p.date
    ORDER BY p.date
    `,
    [orgId, shopDomain, fromKey, toKey]
  );
  const newRepeatMap = new Map(newRepeat.rows.map((r) => [r.date, r]));

  // Merge aggregates into daily_metrics rows.
  const rows = new Map<
    string,
    {
      date: string;
      channel: string;
      utm_campaign: string | null;
      sessions: number;
      addToCart: number;
      checkouts: number;
      paidOrders: number;
      revenue: number;
      newCustomers: number;
      repeatCustomers: number;
    }
  >();

  const upsert = (key: string, base: { date: string; channel: string; utm_campaign: string | null }) => {
    const existing = rows.get(key);
    if (existing) return existing;
    const row = {
      date: base.date,
      channel: base.channel,
      utm_campaign: base.utm_campaign,
      sessions: 0,
      addToCart: 0,
      checkouts: 0,
      paidOrders: 0,
      revenue: 0,
      newCustomers: 0,
      repeatCustomers: 0,
    };
    rows.set(key, row);
    return row;
  };

  eventsAgg.rows.forEach((r) => {
    const date = String(r.date).slice(0, 10);
    const channel = String(r.channel || "unknown");
    const campaign = r.utm_campaign ? String(r.utm_campaign) : null;
    const key = `${date}|${channel}|${campaign || ""}`;
    const row = upsert(key, { date, channel, utm_campaign: campaign });
    row.sessions = Number(r.sessions || 0);
    row.addToCart = Number(r.add_to_cart || 0);
    row.checkouts = Number(r.checkouts || 0);
  });

  paidAgg.rows.forEach((r) => {
    const date = String(r.date).slice(0, 10);
    const channel = String(r.channel || "unknown");
    const campaign = r.utm_campaign ? String(r.utm_campaign) : null;
    const key = `${date}|${channel}|${campaign || ""}`;
    const row = upsert(key, { date, channel, utm_campaign: campaign });
    row.paidOrders = Number(r.paid_orders || 0);
    row.revenue = Number(r.revenue || 0);
  });

  // Allocate new/repeat customers to "unknown" channel for that day; keeps KPI visible without over-attribution.
  for (let d = new Date(fromDate); d.getTime() <= toDate.getTime(); d = addDays(d, 1)) {
    const date = asDateKey(d.toISOString());
    const nr = newRepeatMap.get(date);
    if (!nr) continue;
    const key = `${date}|unknown|`;
    const row = upsert(key, { date, channel: "unknown", utm_campaign: null });
    row.newCustomers = Number(nr.new_customers || 0);
    row.repeatCustomers = Number(nr.repeat_customers || 0);
  }

  for (const row of rows.values()) {
    const aov = row.paidOrders > 0 ? row.revenue / row.paidOrders : null;
    const spend =
      row.utm_campaign && spendKey.has(`${row.date}|${row.utm_campaign}`)
        ? spendKey.get(`${row.date}|${row.utm_campaign}`) || 0
        : 0;
    const roas = spend > 0 ? row.revenue / spend : null;
    const cpa = spend > 0 && row.paidOrders > 0 ? spend / row.paidOrders : null;
    const cac = spend > 0 && row.newCustomers > 0 ? spend / row.newCustomers : null;

    await pool.query(
      `
      INSERT INTO marketing.daily_metrics
        (organization_id, shop_domain, date, channel, utm_campaign, sessions, add_to_cart, checkouts, paid_orders,
         revenue, aov, new_customers, repeat_customers, cac, cpa, roas, updated_at)
      VALUES ($1,$2,$3::date,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW())
      ON CONFLICT (organization_id, shop_domain, date, channel, utm_campaign)
      DO UPDATE SET sessions = EXCLUDED.sessions,
                    add_to_cart = EXCLUDED.add_to_cart,
                    checkouts = EXCLUDED.checkouts,
                    paid_orders = EXCLUDED.paid_orders,
                    revenue = EXCLUDED.revenue,
                    aov = EXCLUDED.aov,
                    new_customers = EXCLUDED.new_customers,
                    repeat_customers = EXCLUDED.repeat_customers,
                    cac = EXCLUDED.cac,
                    cpa = EXCLUDED.cpa,
                    roas = EXCLUDED.roas,
                    updated_at = NOW()
      `,
      [
        orgId,
        shopDomain,
        row.date,
        row.channel,
        row.utm_campaign || "",
        row.sessions,
        row.addToCart,
        row.checkouts,
        row.paidOrders,
        row.revenue,
        aov,
        row.newCustomers,
        row.repeatCustomers,
        cac,
        cpa,
        roas,
      ]
    );
  }

  return {
    shopDomain,
    from: fromKey,
    to: toKey,
    rows: rows.size,
  };
}
