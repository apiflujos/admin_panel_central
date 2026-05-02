import { NextResponse } from "next/server";

import { getOrgId } from "../../../../../../../src/db";
import { isTenantModuleEnabled } from "../../../../../../../src/sa/sa.repository";
import { getAdsAppConfig } from "../../../../../../../src/services/ads-app-config.service";
import { createOAuthState } from "../../../../../../../src/services/oauth-state.service";
import { routeHandler } from "../../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../../lib/route-auth";

const GOOGLE_ADS_PROVIDER = "google_ads";

type OAuthEnv = {
  clientId: string;
  clientSecret: string;
  appHost: string;
};

async function assertModuleEnabled() {
  const enabled = await isTenantModuleEnabled(getOrgId(), GOOGLE_ADS_PROVIDER);
  if (!enabled) {
    throw new Error("Modulo Google Ads desactivado por ApiFlujos.");
  }
}

async function ensureOAuthEnv(): Promise<OAuthEnv> {
  const adsConfig = await getAdsAppConfig();
  const clientId = adsConfig.googleAds.clientId || "";
  const clientSecret = adsConfig.googleAds.clientSecret || "";
  const appHost = adsConfig.appHost || "";
  const missing: string[] = [];
  if (!clientId) missing.push("Google Ads Client ID");
  if (!clientSecret) missing.push("Google Ads Client Secret");
  if (!appHost) missing.push("Base URL");
  if (missing.length) {
    throw new Error(`Configuracion Google Ads incompleta en Conexiones. Falta: ${missing.join(", ")}`);
  }
  return { clientId, clientSecret, appHost };
}

export const GET = routeHandler(async (req: Request) => {
  await requireRouteAdmin();
  try {
    await assertModuleEnabled();
    const env = await ensureOAuthEnv();
    const searchParams = new URL(req.url).searchParams;
    const customerId = String(searchParams.get("customerId") || "").trim();
    const shopDomain = String(searchParams.get("shopDomain") || "").trim();
    if (!customerId) {
      return new NextResponse("Google Ads customerId requerido", { status: 400 });
    }
    if (!shopDomain) {
      return new NextResponse("Shop domain requerido", { status: 400 });
    }
    const nonce = await createOAuthState(GOOGLE_ADS_PROVIDER, { customerId, shopDomain });
    const redirectUri = `${env.appHost}/api/auth/google-ads/callback`;
    const scopes = "https://www.googleapis.com/auth/adwords";
    const authorizeUrl =
      "https://accounts.google.com/o/oauth2/v2/auth" +
      `?client_id=${encodeURIComponent(env.clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&state=${encodeURIComponent(nonce)}`;
    return NextResponse.redirect(authorizeUrl, { status: 302 });
  } catch (error) {
    return new NextResponse((error as { message?: string })?.message || "OAuth error", { status: 500 });
  }
});
