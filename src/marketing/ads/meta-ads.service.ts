import { getOrgId, getPool } from "../../db";
import { readMetaAdsCredentials } from "../../services/store-connections.service";

type MetaAdsSpendRow = {
  date: string;
  campaignName: string;
  spend: number;
  currency: string | null;
};

function normalizeAdAccountId(value: string) {
  return String(value || "").replace(/\D/g, "");
}

async function fetchMetaAdsSpend(input: {
  adAccountId: string;
  accessToken: string;
  from: string;
  to: string;
}) {
  const accountId = normalizeAdAccountId(input.adAccountId);
  const params = new URLSearchParams({
    access_token: input.accessToken,
    level: "campaign",
    fields: "campaign_name,spend,date_start,date_stop,account_currency",
    time_increment: "1",
    time_range: JSON.stringify({ since: input.from, until: input.to }),
  });
  const response = await fetch(`https://graph.facebook.com/v19.0/act_${accountId}/insights?${params.toString()}`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Meta Ads API error");
  }
  const payload = (await response.json()) as { data?: any[]; error?: { message?: string } };
  if (payload.error?.message) {
    throw new Error(payload.error.message);
  }
  const rows: MetaAdsSpendRow[] = [];
  (payload.data || []).forEach((row) => {
    const date = String(row.date_start || "").trim();
    const campaignName = String(row.campaign_name || "").trim();
    const spend = Number(row.spend || 0);
    const currency = row.account_currency ? String(row.account_currency) : null;
    if (!date || !campaignName) return;
    rows.push({ date, campaignName, spend, currency });
  });
  return rows;
}

export async function syncMetaAdsSpend(input: { from: string; to: string }) {
  const pool = getPool();
  const orgId = getOrgId();
  const credentials = await readMetaAdsCredentials(pool, orgId);
  if (!credentials?.accessToken || !credentials?.adAccountId || !credentials?.shopDomain) {
    return { skipped: true, reason: "Meta Ads no conectado" };
  }

  const rows = await fetchMetaAdsSpend({
    adAccountId: credentials.adAccountId,
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
