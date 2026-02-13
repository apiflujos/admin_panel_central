import { getOrgId, getPool } from "../../db";
import { readTikTokAdsCredentials } from "../../services/store-connections.service";

type TikTokAdsSpendRow = {
  date: string;
  campaignName: string;
  spend: number;
  currency: string | null;
};

function normalizeAdvertiserId(value: string) {
  return String(value || "").replace(/\D/g, "");
}

async function fetchTikTokAdsSpend(input: {
  advertiserId: string;
  accessToken: string;
  from: string;
  to: string;
}) {
  const advertiserId = normalizeAdvertiserId(input.advertiserId);
  const response = await fetch("https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/", {
    method: "POST",
    headers: {
      "Access-Token": input.accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      advertiser_id: advertiserId,
      report_type: "BASIC",
      data_level: "AUCTION_CAMPAIGN",
      dimensions: ["campaign_name", "stat_time_day"],
      metrics: ["spend", "currency"],
      start_date: input.from,
      end_date: input.to,
      page: 1,
      page_size: 1000,
    }),
  });
  const payload = (await response.json()) as {
    code?: number;
    message?: string;
    data?: { list?: Array<Record<string, string>> };
  };
  if (payload.code !== 0) {
    throw new Error(payload.message || "TikTok Ads API error");
  }
  const rows: TikTokAdsSpendRow[] = [];
  (payload.data?.list || []).forEach((row) => {
    const date = String(row.stat_time_day || "").trim();
    const campaignName = String(row.campaign_name || "").trim();
    const spend = Number(row.spend || 0);
    const currency = row.currency ? String(row.currency) : null;
    if (!date || !campaignName) return;
    rows.push({ date, campaignName, spend, currency });
  });
  return rows;
}

export async function syncTikTokAdsSpend(input: { from: string; to: string }) {
  const pool = getPool();
  const orgId = getOrgId();
  const credentials = await readTikTokAdsCredentials(pool, orgId);
  if (!credentials?.accessToken || !credentials?.advertiserId || !credentials?.shopDomain) {
    return { skipped: true, reason: "TikTok Ads no conectado" };
  }

  const rows = await fetchTikTokAdsSpend({
    advertiserId: credentials.advertiserId,
    accessToken: credentials.accessToken,
    from: input.from,
    to: input.to,
  });

  for (const row of rows) {
    const amount = Math.max(0, Number(row.spend || 0));
    await pool.query(
      `
      INSERT INTO marketing.campaign_spend (organization_id, shop_domain, date, utm_campaign, amount, currency, updated_at)
      VALUES ($1,$2,$3::date,$4,$5,$6,NOW())
      ON CONFLICT (organization_id, shop_domain, date, utm_campaign)
      DO UPDATE SET amount = EXCLUDED.amount,
                    currency = COALESCE(EXCLUDED.currency, marketing.campaign_spend.currency),
                    updated_at = NOW()
      `,
      [orgId, credentials.shopDomain, row.date, row.campaignName, amount, row.currency]
    );
  }

  return { ok: true, rows: rows.length };
}
