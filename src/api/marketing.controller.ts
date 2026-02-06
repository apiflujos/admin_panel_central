import type { Request, Response } from "express";
import { z } from "zod";
import { syncMarketingOrders } from "../marketing/sync/marketing-sync.service";
import { recomputeDailyMarketingMetrics } from "../marketing/metrics/marketing-metrics.service";
import { getMarketingExecutiveDashboard } from "../marketing/reports/marketing-reports.service";
import { generateMarketingInsights } from "../marketing/ai/marketing-ai.service";
import { getOrgId, getPool } from "../db";

const normalizeShopDomain = (value: unknown) =>
  String(value || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();

const DateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function todayKeyUtc() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysUtc(dateKey: string, days: number) {
  const base = new Date(`${dateKey}T00:00:00.000Z`);
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export async function marketingSyncOrdersHandler(req: Request, res: Response) {
  const schema = z.object({
    shopDomain: z.string().min(3),
    sinceDate: z.string().optional(),
    maxOrders: z.number().int().positive().optional(),
  });
  try {
    const body = schema.parse(req.body || {});
    const result = await syncMarketingOrders(body.shopDomain, {
      sinceDate: body.sinceDate,
      maxOrders: body.maxOrders,
    });
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "sync_error" });
  }
}

export async function marketingRecomputeMetricsHandler(req: Request, res: Response) {
  const schema = z.object({
    shopDomain: z.string().min(3),
    from: z.string().optional(),
    to: z.string().optional(),
  });
  try {
    const body = schema.parse(req.body || {});
    const to = body.to && DateKey.safeParse(body.to).success ? body.to : todayKeyUtc();
    const from = body.from && DateKey.safeParse(body.from).success ? body.from : addDaysUtc(to, -30);
    const result = await recomputeDailyMarketingMetrics({
      shopDomain: body.shopDomain,
      from,
      to,
    });
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "metrics_error" });
  }
}

export async function marketingDashboardHandler(req: Request, res: Response) {
  try {
    const shopDomain = normalizeShopDomain(req.query.shopDomain);
    const to = typeof req.query.to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.to) ? req.query.to : todayKeyUtc();
    const from =
      typeof req.query.from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.from)
        ? req.query.from
        : addDaysUtc(to, -30);
    if (!shopDomain) {
      res.status(400).json({ error: "shopDomain requerido" });
      return;
    }
    const result = await getMarketingExecutiveDashboard({ shopDomain, from, to });
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "dashboard_error" });
  }
}

export async function marketingInsightsHandler(req: Request, res: Response) {
  try {
    const shopDomain = normalizeShopDomain(req.query.shopDomain);
    const to = typeof req.query.to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.to) ? req.query.to : todayKeyUtc();
    const from =
      typeof req.query.from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.from)
        ? req.query.from
        : addDaysUtc(to, -30);
    if (!shopDomain) {
      res.status(400).json({ error: "shopDomain requerido" });
      return;
    }
    const dashboard = await getMarketingExecutiveDashboard({ shopDomain, from, to });
    const insights = generateMarketingInsights(dashboard as any);
    res.status(200).json({ shopDomain, from, to, insights });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "insights_error" });
  }
}

export async function marketingUpsertCampaignSpendHandler(req: Request, res: Response) {
  const schema = z.object({
    shopDomain: z.string().min(3),
    date: DateKey,
    utmCampaign: z.string().min(1),
    amount: z.number().nonnegative(),
    currency: z.string().optional(),
  });
  try {
    const body = schema.parse(req.body || {});
    const pool = getPool();
    const orgId = getOrgId();
    const shopDomain = normalizeShopDomain(body.shopDomain);
    await pool.query(
      `
      INSERT INTO marketing.campaign_spend (organization_id, shop_domain, date, utm_campaign, amount, currency, updated_at)
      VALUES ($1,$2,$3::date,$4,$5,$6,NOW())
      ON CONFLICT (organization_id, shop_domain, date, utm_campaign)
      DO UPDATE SET amount = EXCLUDED.amount,
                    currency = COALESCE(EXCLUDED.currency, marketing.campaign_spend.currency),
                    updated_at = NOW()
      `,
      [orgId, shopDomain, body.date, body.utmCampaign, body.amount, body.currency || null]
    );

    await pool.query(
      `
      INSERT INTO marketing.campaigns (organization_id, shop_domain, utm_source, utm_medium, utm_campaign, utm_content, name, updated_at)
      VALUES ($1,$2,'','',$3,'',$3,NOW())
      ON CONFLICT (organization_id, shop_domain, utm_campaign, utm_source, utm_medium, utm_content)
      DO UPDATE SET updated_at = NOW()
      `,
      [orgId, shopDomain, body.utmCampaign]
    );
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "spend_error" });
  }
}
