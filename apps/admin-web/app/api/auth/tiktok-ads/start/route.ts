import { NextResponse } from "next/server";

import { getOrgId } from "../../../../../../../src/db";
import { isTenantModuleEnabled } from "../../../../../../../src/sa/sa.repository";
import { getAdsAppConfig } from "../../../../../../../src/services/ads-app-config.service";
import { createOAuthState } from "../../../../../../../src/services/oauth-state.service";
import { routeHandler } from "../../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../../lib/route-auth";

const TIKTOK_ADS_PROVIDER = "tiktok_ads";

async function assertModuleEnabled() {
  const enabled = await isTenantModuleEnabled(getOrgId(), TIKTOK_ADS_PROVIDER);
  if (!enabled) {
    throw new Error("Modulo TikTok Ads desactivado por ApiFlujos.");
  }
}

async function ensureOAuthEnv() {
  const adsConfig = await getAdsAppConfig();
  const appId = adsConfig.tiktokAds.appId || "";
  const appSecret = adsConfig.tiktokAds.appSecret || "";
  const appHost = adsConfig.appHost || "";
  const missing: string[] = [];
  if (!appId) missing.push("TikTok App ID");
  if (!appSecret) missing.push("TikTok App Secret");
  if (!appHost) missing.push("Base URL");
  if (missing.length) {
    throw new Error(`Configuracion TikTok Ads incompleta en Conexiones. Falta: ${missing.join(", ")}`);
  }
  return { appId, appSecret, appHost };
}

export const GET = routeHandler(async (req: Request) => {
  await requireRouteAdmin();
  try {
    await assertModuleEnabled();
    const env = await ensureOAuthEnv();
    const searchParams = new URL(req.url).searchParams;
    const advertiserId = String(searchParams.get("advertiserId") || "").trim();
    const shopDomain = String(searchParams.get("shopDomain") || "").trim();
    if (!advertiserId) {
      return new NextResponse("TikTok Ads advertiserId requerido", { status: 400 });
    }
    if (!shopDomain) {
      return new NextResponse("Shop domain requerido", { status: 400 });
    }
    const nonce = await createOAuthState(TIKTOK_ADS_PROVIDER, { advertiserId, shopDomain });
    const redirectUri = `${env.appHost}/api/auth/tiktok-ads/callback`;
    const scopes = "ads.read";
    const authorizeUrl =
      "https://business-api.tiktok.com/open_api/v1.3/oauth2/authorize/" +
      `?app_id=${encodeURIComponent(env.appId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${encodeURIComponent(nonce)}` +
      `&scope=${encodeURIComponent(scopes)}`;
    return NextResponse.redirect(authorizeUrl, { status: 302 });
  } catch (error) {
    return new NextResponse((error as { message?: string })?.message || "OAuth error", { status: 500 });
  }
});
