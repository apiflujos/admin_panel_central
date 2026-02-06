import { getOrgId, getPool } from "../../db";

const normalizeShopDomain = (value: unknown) =>
  String(value || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();

type AlertRuleRow = {
  id: string;
  name: string;
  rule_type: string;
  threshold: string | number | null;
  window_days: number;
  enabled: boolean;
  notify_email: string | null;
  notify_webhook_url: string | null;
  notify_whatsapp: string | null;
};

export async function evaluateMarketingAlerts(shopDomain: string, date: string) {
  const pool = getPool();
  const orgId = getOrgId();
  const domain = normalizeShopDomain(shopDomain);
  const day = String(date || "").slice(0, 10);
  if (!domain) throw new Error("shopDomain requerido");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("date inválida");

  const rulesRes = await pool.query<AlertRuleRow>(
    `
    SELECT id::text, name, rule_type, threshold, window_days, enabled, notify_email, notify_webhook_url, notify_whatsapp
    FROM marketing.alert_rules
    WHERE organization_id = $1 AND shop_domain = $2 AND enabled = true
    ORDER BY id ASC
    `,
    [orgId, domain]
  );

  const created: Array<{ ruleId: string; message: string; severity: string }> = [];
  for (const rule of rulesRes.rows) {
    const ruleType = String(rule.rule_type || "").trim();
    const threshold = rule.threshold === null ? null : Number(rule.threshold);
    const windowDays = Math.max(1, Number(rule.window_days || 7));

    const metrics = await pool.query<{
      revenue: string;
      paid_orders: string;
      sessions: string;
      add_to_cart: string;
      checkouts: string;
      roas_avg: string | null;
      cpa_avg: string | null;
    }>(
      `
      SELECT
        COALESCE(SUM(revenue),0)::text AS revenue,
        COALESCE(SUM(paid_orders),0)::text AS paid_orders,
        COALESCE(SUM(sessions),0)::text AS sessions,
        COALESCE(SUM(add_to_cart),0)::text AS add_to_cart,
        COALESCE(SUM(checkouts),0)::text AS checkouts,
        NULLIF(AVG(roas)::text,'') AS roas_avg,
        NULLIF(AVG(cpa)::text,'') AS cpa_avg
      FROM marketing.daily_metrics
      WHERE organization_id = $1 AND shop_domain = $2
        AND date >= ($3::date - ($4::int - 1) * INTERVAL '1 day')
        AND date <= $3::date
      `,
      [orgId, domain, day, windowDays]
    );
    const m = metrics.rows[0];
    const revenue = Number(m?.revenue || 0);
    const paidOrders = Number(m?.paid_orders || 0);
    const sessions = Number(m?.sessions || 0);
    const addToCart = Number(m?.add_to_cart || 0);
    const checkouts = Number(m?.checkouts || 0);
    const roas = m?.roas_avg ? Number(m.roas_avg) : null;
    const cpa = m?.cpa_avg ? Number(m.cpa_avg) : null;

    const conv = checkouts > 0 ? paidOrders / checkouts : null;

    let fired: { message: string; severity: "warn" | "critical"; payload: Record<string, unknown> } | null = null;

    if (ruleType === "roas_low" && threshold !== null && roas !== null && roas < threshold) {
      fired = {
        message: `${rule.name}: ROAS ${roas.toFixed(2)} < ${threshold}`,
        severity: "critical",
        payload: { roas, threshold, windowDays, revenue },
      };
    }
    if (ruleType === "cpa_high" && threshold !== null && cpa !== null && cpa > threshold) {
      fired = {
        message: `${rule.name}: CPA ${cpa.toFixed(2)} > ${threshold}`,
        severity: "critical",
        payload: { cpa, threshold, windowDays, paidOrders },
      };
    }
    if (ruleType === "conversion_drop" && threshold !== null && conv !== null && conv < threshold) {
      fired = {
        message: `${rule.name}: Checkout→Pago ${(conv * 100).toFixed(1)}% < ${(threshold * 100).toFixed(1)}%`,
        severity: "warn",
        payload: { conv, threshold, windowDays, sessions, addToCart, checkouts, paidOrders },
      };
    }

    if (!fired) continue;

    await pool.query(
      `
      INSERT INTO marketing.alerts (organization_id, shop_domain, rule_id, date, severity, message, payload, created_at)
      VALUES ($1,$2,$3,$4::date,$5,$6,$7,NOW())
      `,
      [orgId, domain, rule.id, day, fired.severity, fired.message, fired.payload]
    );
    created.push({ ruleId: rule.id, message: fired.message, severity: fired.severity });

    await notify(rule, fired.message, fired.payload);
  }

  return { shopDomain: domain, date: day, created };
}

async function notify(rule: AlertRuleRow, message: string, payload: Record<string, unknown>) {
  // Webhook notification (production-ready default).
  const url = rule.notify_webhook_url ? String(rule.notify_webhook_url).trim() : "";
  if (url) {
    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ruleId: rule.id,
          ruleName: rule.name,
          type: rule.rule_type,
          message,
          payload,
          at: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error("Alert webhook failed:", error);
    }
  }

  // Email/WhatsApp are abstract here (pluggable providers).
  if (rule.notify_email) {
    console.log("[ALERT][EMAIL]", rule.notify_email, message);
  }
  if (rule.notify_whatsapp) {
    console.log("[ALERT][WHATSAPP]", rule.notify_whatsapp, message);
  }
}

