import { decryptString } from "../utils/crypto";
import { getOrgId, getPool } from "../db";

const PROVIDERS = {
  appHost: "app_host",
  google: "google_ads_app",
  meta: "meta_ads_app",
  tiktok: "tiktok_ads_app",
} as const;

const isCryptoKeyMisconfigured = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || "");
  return (
    message.includes("CRYPTO_KEY_BASE64 must be 32 bytes") ||
    message.includes("CRYPTO_KEY_BASE64") ||
    message.toLowerCase().includes("invalid key length")
  );
};

async function readCredentialSafe(provider: string) {
  const pool = getPool();
  const orgId = getOrgId();
  const res = await pool.query<{ data_encrypted: string }>(
    `
    SELECT data_encrypted
    FROM credentials
    WHERE organization_id = $1 AND provider = $2
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId, provider]
  );
  if (!res.rows.length) return { data: null as Record<string, string> | null, needsReconnect: false };
  try {
    const decrypted = decryptString(res.rows[0].data_encrypted);
    return { data: JSON.parse(decrypted) as Record<string, string>, needsReconnect: false };
  } catch (error) {
    if (isCryptoKeyMisconfigured(error)) {
      throw error;
    }
    return { data: null, needsReconnect: true };
  }
}

export async function getAdsAppConfig() {
  const appHost = await readCredentialSafe(PROVIDERS.appHost);
  const google = await readCredentialSafe(PROVIDERS.google);
  const meta = await readCredentialSafe(PROVIDERS.meta);
  const tiktok = await readCredentialSafe(PROVIDERS.tiktok);
  return {
    appHost: String(appHost.data?.appHost || ""),
    googleAds: {
      clientId: String(google.data?.clientId || ""),
      clientSecret: String(google.data?.clientSecret || ""),
      developerToken: String(google.data?.developerToken || ""),
    },
    metaAds: {
      appId: String(meta.data?.appId || ""),
      appSecret: String(meta.data?.appSecret || ""),
    },
    tiktokAds: {
      appId: String(tiktok.data?.appId || ""),
      appSecret: String(tiktok.data?.appSecret || ""),
    },
  };
}
