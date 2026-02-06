import { getOrgId, getPool } from "../../db";

const normalizeShopDomain = (value: unknown) =>
  String(value || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();

function isDateKey(value: unknown) {
  const raw = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
}

export async function getMarketingExecutiveDashboard(input: {
  shopDomain: string;
  from: string;
  to: string;
}) {
  const pool = getPool();
  const orgId = getOrgId();
  const shopDomain = normalizeShopDomain(input.shopDomain);
  const from = isDateKey(input.from);
  const to = isDateKey(input.to);
  if (!shopDomain) throw new Error("shopDomain requerido");
  if (!from || !to) throw new Error("from/to inválidos");

  const summary = await pool.query<{
    revenue: string;
    paid_orders: string;
    sessions: string;
    add_to_cart: string;
    checkouts: string;
    new_customers: string;
    repeat_customers: string;
  }>(
    `
    SELECT
      COALESCE(SUM(revenue),0)::text AS revenue,
      COALESCE(SUM(paid_orders),0)::text AS paid_orders,
      COALESCE(SUM(sessions),0)::text AS sessions,
      COALESCE(SUM(add_to_cart),0)::text AS add_to_cart,
      COALESCE(SUM(checkouts),0)::text AS checkouts,
      COALESCE(SUM(new_customers),0)::text AS new_customers,
      COALESCE(SUM(repeat_customers),0)::text AS repeat_customers
    FROM marketing.daily_metrics
    WHERE organization_id = $1 AND shop_domain = $2 AND date >= $3::date AND date <= $4::date
    `,
    [orgId, shopDomain, from, to]
  );
  const s = summary.rows[0] || {
    revenue: "0",
    paid_orders: "0",
    sessions: "0",
    add_to_cart: "0",
    checkouts: "0",
    new_customers: "0",
    repeat_customers: "0",
  };
  const revenue = Number(s.revenue || 0);
  const paidOrders = Number(s.paid_orders || 0);
  const sessions = Number(s.sessions || 0);
  const addToCart = Number(s.add_to_cart || 0);
  const checkouts = Number(s.checkouts || 0);
  const aov = paidOrders > 0 ? revenue / paidOrders : null;
  const convCheckout = checkouts > 0 ? paidOrders / checkouts : null;
  const convCart = addToCart > 0 ? checkouts / addToCart : null;
  const convSession = sessions > 0 ? addToCart / sessions : null;

  const spendRes = await pool.query<{ spend: string }>(
    `
    SELECT COALESCE(SUM(amount),0)::text AS spend
    FROM marketing.campaign_spend
    WHERE organization_id = $1 AND shop_domain = $2 AND date >= $3::date AND date <= $4::date
    `,
    [orgId, shopDomain, from, to]
  );
  const spend = Number(spendRes.rows[0]?.spend || 0);

  const customersRes = await pool.query<{ customers: string }>(
    `
    SELECT COUNT(DISTINCT NULLIF(customer_email,''))::text AS customers
    FROM marketing.orders
    WHERE organization_id = $1
      AND shop_domain = $2
      AND COALESCE(processed_at_shopify, created_at_shopify, created_at)::date >= $3::date
      AND COALESCE(processed_at_shopify, created_at_shopify, created_at)::date <= $4::date
      AND LOWER(COALESCE(financial_status,'')) IN ('paid','partially_paid','authorized')
    `,
    [orgId, shopDomain, from, to]
  );
  const uniqueCustomers = Number(customersRes.rows[0]?.customers || 0);

  const roas = spend > 0 ? revenue / spend : null;
  const cpa = spend > 0 && paidOrders > 0 ? spend / paidOrders : null;
  const customersNew = Number(s.new_customers || 0);
  const cac = spend > 0 && customersNew > 0 ? spend / customersNew : null;
  const ltv = uniqueCustomers > 0 ? revenue / uniqueCustomers : null;

  const byChannel = await pool.query<{
    channel: string;
    revenue: string;
    paid_orders: string;
    sessions: string;
    checkouts: string;
    roas: string | null;
  }>(
    `
    SELECT
      channel,
      COALESCE(SUM(revenue),0)::text AS revenue,
      COALESCE(SUM(paid_orders),0)::text AS paid_orders,
      COALESCE(SUM(sessions),0)::text AS sessions,
      COALESCE(SUM(checkouts),0)::text AS checkouts,
      NULLIF(AVG(roas)::text, '') AS roas
    FROM marketing.daily_metrics
    WHERE organization_id = $1 AND shop_domain = $2 AND date >= $3::date AND date <= $4::date
    GROUP BY channel
    ORDER BY SUM(revenue) DESC
    `,
    [orgId, shopDomain, from, to]
  );

  const topProducts = await pool.query<{
    product_title: string;
    units: string;
    amount: string;
  }>(
    `
    SELECT
      COALESCE(NULLIF(oi.product_title,''), 'Producto') AS product_title,
      COALESCE(SUM(oi.quantity),0)::text AS units,
      COALESCE(SUM(COALESCE(oi.line_amount,0)),0)::text AS amount
    FROM marketing.order_items oi
    JOIN marketing.orders o
      ON o.organization_id = oi.organization_id
     AND o.shop_domain = oi.shop_domain
     AND o.shopify_order_gid = oi.shopify_order_gid
    WHERE oi.organization_id = $1
      AND oi.shop_domain = $2
      AND COALESCE(o.processed_at_shopify, o.created_at_shopify, o.created_at)::date >= $3::date
      AND COALESCE(o.processed_at_shopify, o.created_at_shopify, o.created_at)::date <= $4::date
      AND LOWER(COALESCE(o.financial_status,'')) IN ('paid','partially_paid','authorized')
    GROUP BY product_title
    ORDER BY SUM(COALESCE(oi.line_amount,0)) DESC
    LIMIT 20
    `,
    [orgId, shopDomain, from, to]
  );

  const topCampaigns = await pool.query<{
    utm_campaign: string;
    revenue: string;
    paid_orders: string;
    spend: string;
  }>(
    `
    WITH rev AS (
      SELECT utm_campaign,
             COALESCE(SUM(revenue),0)::numeric AS revenue,
             COALESCE(SUM(paid_orders),0)::int AS paid_orders
      FROM marketing.daily_metrics
      WHERE organization_id = $1
        AND shop_domain = $2
        AND date >= $3::date AND date <= $4::date
        AND utm_campaign <> ''
      GROUP BY utm_campaign
    ),
    spend AS (
      SELECT utm_campaign, COALESCE(SUM(amount),0)::numeric AS spend
      FROM marketing.campaign_spend
      WHERE organization_id = $1
        AND shop_domain = $2
        AND date >= $3::date AND date <= $4::date
      GROUP BY utm_campaign
    )
    SELECT
      rev.utm_campaign,
      rev.revenue::text AS revenue,
      rev.paid_orders::text AS paid_orders,
      COALESCE(spend.spend,0)::text AS spend
    FROM rev
    LEFT JOIN spend ON spend.utm_campaign = rev.utm_campaign
    ORDER BY rev.revenue DESC
    LIMIT 25
    `,
    [orgId, shopDomain, from, to]
  );

  const series = await pool.query<{
    date: string;
    revenue: string;
    paid_orders: string;
    sessions: string;
    checkouts: string;
  }>(
    `
    SELECT
      date::text AS date,
      COALESCE(SUM(revenue),0)::text AS revenue,
      COALESCE(SUM(paid_orders),0)::text AS paid_orders,
      COALESCE(SUM(sessions),0)::text AS sessions,
      COALESCE(SUM(checkouts),0)::text AS checkouts
    FROM marketing.daily_metrics
    WHERE organization_id = $1 AND shop_domain = $2 AND date >= $3::date AND date <= $4::date
    GROUP BY date
    ORDER BY date ASC
    `,
    [orgId, shopDomain, from, to]
  );

  return {
    shopDomain,
    from,
    to,
    kpis: {
      revenue,
      spend,
      roas,
      cac,
      cpa,
      ltv,
      paidOrders,
      aov,
      customersNew,
      customersRepeat: Number(s.repeat_customers || 0),
      funnel: {
        sessions,
        addToCart,
        checkouts,
        paidOrders,
        convSessionToCart: convSession,
        convCartToCheckout: convCart,
        convCheckoutToPaid: convCheckout,
      },
    },
    byChannel: byChannel.rows.map((r) => ({
      channel: r.channel,
      revenue: Number(r.revenue || 0),
      paidOrders: Number(r.paid_orders || 0),
      sessions: Number(r.sessions || 0),
      checkouts: Number(r.checkouts || 0),
      roas: r.roas ? Number(r.roas) : null,
    })),
    topProducts: topProducts.rows.map((r) => ({
      name: r.product_title,
      units: Number(r.units || 0),
      amount: Number(r.amount || 0),
    })),
    topCampaigns: topCampaigns.rows.map((r) => {
      const revenue = Number(r.revenue || 0);
      const spend = Number(r.spend || 0);
      return {
        utmCampaign: r.utm_campaign || null,
        revenue,
        paidOrders: Number(r.paid_orders || 0),
        roas: spend > 0 ? revenue / spend : null,
      };
    }),
    series: series.rows.map((r) => ({
      date: r.date,
      revenue: Number(r.revenue || 0),
      paidOrders: Number(r.paid_orders || 0),
      sessions: Number(r.sessions || 0),
      checkouts: Number(r.checkouts || 0),
    })),
  };
}
