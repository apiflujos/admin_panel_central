import { getOrgId, getPool } from "../../db";
import { readGoogleAdsCredentials, upsertGoogleAdsCredentials } from "../../services/store-connections.service";
import { getAdsAppConfig } from "../../services/ads-app-config.service";

type GoogleAdsSpendRow = {
  date: string;
  campaignName: string;
  costMicros: number;
  currency: string | null;
};

function normalizeCustomerId(value: string) {
  return String(value || "").replace(/\D/g, "");
}

async function refreshAccessToken(refreshToken: string) {
  const adsConfig = await getAdsAppConfig();
  const clientId = adsConfig.googleAds.clientId || "";
  const clientSecret = adsConfig.googleAds.clientSecret || "";
  if (!clientId || !clientSecret) {
    throw new Error("Google Ads OAuth no configurado");
  }
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "No se pudo refrescar access token");
  }
  const payload = (await response.json()) as { access_token?: string; expires_in?: number };
  const accessToken = String(payload.access_token || "").trim();
  if (!accessToken) {
    throw new Error("Access token vacio");
  }
  const expiresAt = new Date(Date.now() + Math.max(1, Number(payload.expires_in || 0)) * 1000).toISOString();
  return { accessToken, expiresAt };
}

async function fetchGoogleAdsSpend(input: {
  customerId: string;
  accessToken: string;
  loginCustomerId?: string | null;
  from: string;
  to: string;
}) {
  const adsConfig = await getAdsAppConfig();
  const developerToken = adsConfig.googleAds.developerToken || "";
  if (!developerToken) {
    throw new Error("GOOGLE_ADS_DEVELOPER_TOKEN requerido");
  }
  const customerId = normalizeCustomerId(input.customerId);
  const query = `
    SELECT
      segments.date,
      campaign.id,
      campaign.name,
      metrics.cost_micros,
      customer.currency_code
    FROM campaign
    WHERE segments.date BETWEEN '${input.from}' AND '${input.to}'
  `;
  const response = await fetch(
    `https://googleads.googleapis.com/v14/customers/${customerId}/googleAds:searchStream`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "developer-token": developerToken,
        ...(input.loginCustomerId ? { "login-customer-id": input.loginCustomerId } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    }
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Google Ads API error");
  }
  const raw = await response.text();
  const rows: GoogleAdsSpendRow[] = [];
  raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const payload = JSON.parse(line) as { results?: any[] };
      (payload.results || []).forEach((result) => {
        const date = String(result?.segments?.date || "").trim();
        const campaignName = String(result?.campaign?.name || "").trim();
        const costMicros = Number(result?.metrics?.costMicros || 0);
        const currency = result?.customer?.currencyCode ? String(result.customer.currencyCode) : null;
        if (!date || !campaignName) return;
        rows.push({ date, campaignName, costMicros, currency });
      });
    });
  return rows;
}

export async function syncGoogleAdsSpend(input: { from: string; to: string }) {
  const pool = getPool();
  const orgId = getOrgId();
  const credentials = await readGoogleAdsCredentials(pool, orgId);
  if (!credentials?.refreshToken || !credentials?.customerId || !credentials?.shopDomain) {
    return { skipped: true, reason: "Google Ads no conectado" };
  }
  const refreshed = await refreshAccessToken(credentials.refreshToken);
  await upsertGoogleAdsCredentials({
    refreshToken: credentials.refreshToken,
    accessToken: refreshed.accessToken,
    expiresAt: refreshed.expiresAt,
    customerId: credentials.customerId,
    shopDomain: credentials.shopDomain,
    loginCustomerId: credentials.loginCustomerId || null,
  });

  const rows = await fetchGoogleAdsSpend({
    customerId: credentials.customerId,
    accessToken: refreshed.accessToken,
    loginCustomerId: credentials.loginCustomerId || null,
    from: input.from,
    to: input.to,
  });

  for (const row of rows) {
    const amount = Math.max(0, Number(row.costMicros || 0) / 1_000_000);
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
