import { getPool, runWithOrg } from "../../../../src/db";
import { getRedis } from "../../../../src/marketing/infra/redis";
import { buildMarketingQueues, buildWorker } from "../../../../src/marketing/infra/queue";
import { startCron } from "../../../../src/marketing/infra/cron";
import { syncMarketingOrders } from "../../../../src/marketing/sync/marketing-sync.service";
import { recomputeDailyMarketingMetrics } from "../../../../src/marketing/metrics/marketing-metrics.service";
import { evaluateMarketingAlerts } from "../../../../src/marketing/alerts/marketing-alerts.service";
import { syncGoogleAdsSpend } from "../../../../src/marketing/ads/google-ads.service";
import { syncMetaAdsSpend } from "../../../../src/marketing/ads/meta-ads.service";
import { syncTikTokAdsSpend } from "../../../../src/marketing/ads/tiktok-ads.service";
import { withEachOrganization } from "../../../../src/services/organizations.service";

const CRON_TIMEZONE = String(process.env.MARKETING_CRON_TIMEZONE || "America/Bogota");

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function listShopDomainsForCurrentOrg(orgId: number) {
  const pool = getPool();
  const res = await pool.query<{ shop_domain: string }>(
    `SELECT DISTINCT shop_domain FROM shopify_stores WHERE organization_id = $1`,
    [orgId]
  );
  return res.rows.map((r) => String(r.shop_domain || "").trim()).filter(Boolean);
}

export function startMarketingWorker() {
  const enabled = String(process.env.MARKETING_ENABLED || "true").toLowerCase() !== "false";
  if (!enabled) return;

  const redis = getRedis();
  const queues = buildMarketingQueues(redis);

  const withJobOrg = async <T,>(orgIdRaw: unknown, fn: () => Promise<T>): Promise<T | null> => {
    const orgId = Number(orgIdRaw);
    if (!Number.isInteger(orgId) || orgId <= 0) {
      console.warn("[marketing worker] job sin orgId — skip");
      return null;
    }
    return runWithOrg(orgId, fn);
  };

  buildWorker("marketing_sync", redis, async (job) => {
    if (job.name === "sync_orders") {
      const { shopDomain, sinceDate, maxOrders, orgId } = (job.data || {}) as Record<string, unknown>;
      return withJobOrg(orgId, () =>
        syncMarketingOrders(String(shopDomain || ""), {
          sinceDate: typeof sinceDate === "string" ? sinceDate : undefined,
          maxOrders: typeof maxOrders === "number" ? maxOrders : undefined,
        })
      );
    }
    return null;
  });

  buildWorker("marketing_metrics", redis, async (job) => {
    if (job.name === "recompute_daily") {
      const { shopDomain, from, to, orgId } = (job.data || {}) as Record<string, unknown>;
      return withJobOrg(orgId, () =>
        recomputeDailyMarketingMetrics({
          shopDomain: String(shopDomain || ""),
          from: String(from || ""),
          to: String(to || ""),
        })
      );
    }
    return null;
  });

  buildWorker("marketing_alerts", redis, async (job) => {
    if (job.name === "evaluate_alerts") {
      const { shopDomain, date, orgId } = (job.data || {}) as Record<string, unknown>;
      return withJobOrg(orgId, () =>
        evaluateMarketingAlerts(String(shopDomain || ""), String(date || ""))
      );
    }
    return null;
  });

  const syncSpec = String(process.env.MARKETING_CRON_SYNC || "0 2 * * *");
  const metricsSpec = String(process.env.MARKETING_CRON_METRICS || "30 2 * * *");
  const alertsSpec = String(process.env.MARKETING_CRON_ALERTS || "0 3 * * *");
  const adsSpec = String(process.env.MARKETING_CRON_ADS || "15 2 * * *");

  startCron(
    syncSpec,
    async () => {
      await withEachOrganization(async (orgId) => {
        const shops = await listShopDomainsForCurrentOrg(orgId);
        for (const shopDomain of shops) {
          await queues.sync.add(
            "sync_orders",
            { shopDomain, orgId },
            { jobId: `sync_orders:${orgId}:${shopDomain}:${todayKey()}` }
          );
        }
      });
    },
    { timezone: CRON_TIMEZONE }
  ).start();

  startCron(
    metricsSpec,
    async () => {
      await withEachOrganization(async (orgId) => {
        const shops = await listShopDomainsForCurrentOrg(orgId);
        const to = todayKey();
        const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        for (const shopDomain of shops) {
          await queues.metrics.add(
            "recompute_daily",
            { shopDomain, from, to, orgId },
            { jobId: `metrics:${orgId}:${shopDomain}:${from}:${to}` }
          );
        }
      });
    },
    { timezone: CRON_TIMEZONE }
  ).start();

  startCron(
    alertsSpec,
    async () => {
      await withEachOrganization(async (orgId) => {
        const shops = await listShopDomainsForCurrentOrg(orgId);
        const date = todayKey();
        for (const shopDomain of shops) {
          await queues.alerts.add(
            "evaluate_alerts",
            { shopDomain, date, orgId },
            { jobId: `alerts:${orgId}:${shopDomain}:${date}` }
          );
        }
      });
    },
    { timezone: CRON_TIMEZONE }
  ).start();

  startCron(
    adsSpec,
    async () => {
      const to = todayKey();
      const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      await withEachOrganization(async () => {
        try {
          await syncGoogleAdsSpend({ from, to });
          await syncMetaAdsSpend({ from, to });
          await syncTikTokAdsSpend({ from, to });
        } catch (error) {
          console.log("[marketing] ads sync failed", (error as Error)?.message || error);
        }
      });
    },
    { timezone: CRON_TIMEZONE }
  ).start();

  console.log("[marketing] jobs scheduled", { syncSpec, metricsSpec, alertsSpec, adsSpec, tz: CRON_TIMEZONE });
}
