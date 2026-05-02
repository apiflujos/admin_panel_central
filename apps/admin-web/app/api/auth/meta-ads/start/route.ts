import { NextResponse } from "next/server";

import { getOrgId } from "../../../../../../../src/db";
import { isTenantModuleEnabled } from "../../../../../../../src/sa/sa.repository";
import { getAdsAppConfig } from "../../../../../../../src/services/ads-app-config.service";
import { createOAuthState } from "../../../../../../../src/services/oauth-state.service";
import { routeHandler } from "../../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../../lib/route-auth";

const META_ADS_PROVIDER = "meta_ads";

async function assertModuleEnabled() {
  const enabled = await isTenantModuleEnabled(getOrgId(), META_ADS_PROVIDER);
  if (!enabled) {
    throw new Error("Modulo Meta Ads desactivado por ApiFlujos.");
  }
}

async function ensureOAuthEnv() {
  const adsConfig = await getAdsAppConfig();
  const appId = adsConfig.metaAds.appId || "";
  const appSecret = adsConfig.metaAds.appSecret || "";
  const appHost = adsConfig.appHost || "";
  const missing: string[] = [];
  if (!appId) missing.push("Meta App ID");
  if (!appSecret) missing.push("Meta App Secret");
  if (!appHost) missing.push("Base URL");
  if (missing.length) {
    throw new Error(`Configuracion Meta Ads incompleta en Conexiones. Falta: ${missing.join(", ")}`);
  }
  return { appId, appSecret, appHost };
}

export const GET = routeHandler(async (req: Request) => {
  await requireRouteAdmin();
  try {
    await assertModuleEnabled();
    const env = await ensureOAuthEnv();
    const searchParams = new URL(req.url).searchParams;
    const adAccountId = String(searchParams.get("adAccountId") || "").trim();
    const shopDomain = String(searchParams.get("shopDomain") || "").trim();
    if (!adAccountId) {
      return new NextResponse("Meta Ads adAccountId requerido", { status: 400 });
    }
    if (!shopDomain) {
      return new NextResponse("Shop domain requerido", { status: 400 });
    }
    const nonce = await createOAuthState(META_ADS_PROVIDER, { adAccountId, shopDomain });
    const redirectUri = `${env.appHost}/api/auth/meta-ads/callback`;
    const scopes = "ads_read,read_insights";
    const authorizeUrl =
      "https://www.facebook.com/v19.0/dialog/oauth" +
      `?client_id=${encodeURIComponent(env.appId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${encodeURIComponent(nonce)}` +
      `&scope=${encodeURIComponent(scopes)}`;
    return NextResponse.redirect(authorizeUrl, { status: 302 });
  } catch (error) {
    return new NextResponse((error as { message?: string })?.message || "OAuth error", { status: 500 });
  }
});
