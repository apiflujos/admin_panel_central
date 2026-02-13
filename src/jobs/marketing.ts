import { getPool, getOrgId } from "../db";
import { getRedis } from "../marketing/infra/redis";
import { buildMarketingQueues, buildWorker } from "../marketing/infra/queue";
import { startCron } from "../marketing/infra/cron";
import { syncMarketingOrders } from "../marketing/sync/marketing-sync.service";
import { recomputeDailyMarketingMetrics } from "../marketing/metrics/marketing-metrics.service";
import { evaluateMarketingAlerts } from "../marketing/alerts/marketing-alerts.service";
import { syncGoogleAdsSpend } from "../marketing/ads/google-ads.service";
import { syncMetaAdsSpend } from "../marketing/ads/meta-ads.service";
import { syncTikTokAdsSpend } from "../marketing/ads/tiktok-ads.service";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function listShopDomains() {
  const pool = getPool();
  const orgId = getOrgId();
  const res = await pool.query<{ shop_domain: string }>(
    `SELECT DISTINCT shop_domain FROM shopify_stores WHERE organization_id = $1`,
    [orgId]
  );
  return res.rows.map((r) => String(r.shop_domain || "").trim()).filter(Boolean);
}

export function startMarketingJobs() {
  const enabled = String(process.env.MARKETING_ENABLED || "true").toLowerCase() !== "false";
  if (!enabled) return;

  const redis = getRedis();
  const queues = buildMarketingQueues(redis);

  buildWorker("marketing_sync", redis, async (job) => {
    if (job.name === "sync_orders") {
      const { shopDomain, sinceDate, maxOrders } = (job.data || {}) as Record<string, unknown>;
      return syncMarketingOrders(String(shopDomain || ""), {
        sinceDate: typeof sinceDate === "string" ? sinceDate : undefined,
        maxOrders: typeof maxOrders === "number" ? maxOrders : undefined,
      });
    }
    return null;
  });

  buildWorker("marketing_metrics", redis, async (job) => {
    if (job.name === "recompute_daily") {
      const { shopDomain, from, to } = (job.data || {}) as Record<string, unknown>;
      return recomputeDailyMarketingMetrics({
        shopDomain: String(shopDomain || ""),
        from: String(from || ""),
        to: String(to || ""),
      });
    }
    return null;
  });

  buildWorker("marketing_alerts", redis, async (job) => {
    if (job.name === "evaluate_alerts") {
      const { shopDomain, date } = (job.data || {}) as Record<string, unknown>;
      return evaluateMarketingAlerts(String(shopDomain || ""), String(date || ""));
    }
    return null;
  });

  // Cron: enqueue jobs (preferred) or run inline if Redis missing.
  const syncSpec = String(process.env.MARKETING_CRON_SYNC || "0 2 * * *"); // 02:00 daily
  const metricsSpec = String(process.env.MARKETING_CRON_METRICS || "30 2 * * *"); // 02:30 daily
  const alertsSpec = String(process.env.MARKETING_CRON_ALERTS || "0 3 * * *"); // 03:00 daily
  const adsSpec = String(process.env.MARKETING_CRON_ADS || "15 2 * * *"); // 02:15 daily

  startCron(syncSpec, async () => {
    const shops = await listShopDomains();
    for (const shopDomain of shops) {
      await queues.sync.add("sync_orders", { shopDomain }, { jobId: `sync_orders:${shopDomain}:${todayKey()}` });
    }
  }).start();

  startCron(metricsSpec, async () => {
    const shops = await listShopDomains();
    const to = todayKey();
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    for (const shopDomain of shops) {
      await queues.metrics.add(
        "recompute_daily",
        { shopDomain, from, to },
        { jobId: `metrics:${shopDomain}:${from}:${to}` }
      );
    }
  }).start();

  startCron(alertsSpec, async () => {
    const shops = await listShopDomains();
    const date = todayKey();
    for (const shopDomain of shops) {
      await queues.alerts.add("evaluate_alerts", { shopDomain, date }, { jobId: `alerts:${shopDomain}:${date}` });
    }
  }).start();

  startCron(adsSpec, async () => {
    const to = todayKey();
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    try {
      await syncGoogleAdsSpend({ from, to });
      await syncMetaAdsSpend({ from, to });
      await syncTikTokAdsSpend({ from, to });
    } catch (error) {
      console.log("[marketing] ads sync failed", (error as Error)?.message || error);
    }
  }).start();

  console.log("[marketing] jobs scheduled", { syncSpec, metricsSpec, alertsSpec, adsSpec });
}
