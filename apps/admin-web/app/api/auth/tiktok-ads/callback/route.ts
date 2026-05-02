import { NextResponse } from "next/server";

import { getOrgId } from "../../../../../../../src/db";
import { isTenantModuleEnabled } from "../../../../../../../src/sa/sa.repository";
import { getAdsAppConfig } from "../../../../../../../src/services/ads-app-config.service";
import { consumeOAuthState } from "../../../../../../../src/services/oauth-state.service";
import { upsertTikTokAdsCredentials } from "../../../../../../../src/services/store-connections.service";
import { routeHandler } from "../../../../../lib/route-handler";

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
  try {
    await assertModuleEnabled();
    const env = await ensureOAuthEnv();
    const searchParams = new URL(req.url).searchParams;
    if (searchParams.get("error")) {
      return new NextResponse(String(searchParams.get("error_description") || searchParams.get("error")), {
        status: 400,
      });
    }
    const code = String(searchParams.get("code") || "").trim();
    const state = String(searchParams.get("state") || "").trim();
    if (!code || !state) {
      return new NextResponse("Missing OAuth params", { status: 400 });
    }
    const stateResult = await consumeOAuthState(TIKTOK_ADS_PROVIDER, state);
    if (!stateResult.ok) {
      return new NextResponse("State invalido", { status: 400 });
    }
    const payload = stateResult.payload as { advertiserId?: string; shopDomain?: string } | null;
    const advertiserId = String(payload?.advertiserId || "").trim();
    const shopDomain = String(payload?.shopDomain || "").trim();
    if (!advertiserId) {
      return new NextResponse("TikTok Ads advertiserId requerido", { status: 400 });
    }
    if (!shopDomain) {
      return new NextResponse("Shop domain requerido", { status: 400 });
    }

    const redirectUri = `${env.appHost}/api/auth/tiktok-ads/callback`;
    const tokenResponse = await fetch("https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: env.appId,
        secret: env.appSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });
    const tokenPayload = (await tokenResponse.json()) as {
      code?: number;
      message?: string;
      data?: {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
      };
    };
    if (tokenPayload.code !== 0 || !tokenPayload.data?.access_token) {
      throw new Error(tokenPayload.message || "No se pudo obtener access token");
    }
    const accessToken = String(tokenPayload.data.access_token || "").trim();
    const refreshToken = String(tokenPayload.data.refresh_token || "").trim();
    const expiresAt = new Date(
      Date.now() + Math.max(1, Number(tokenPayload.data.expires_in || 0)) * 1000
    ).toISOString();
    await upsertTikTokAdsCredentials({
      accessToken,
      advertiserId,
      shopDomain,
      refreshToken,
      expiresAt,
    });
    const redirectUrl = new URL(`${env.appHost}/dashboard`);
    redirectUrl.searchParams.set("connections", "1");
    return NextResponse.redirect(redirectUrl.toString(), { status: 302 });
  } catch (error) {
    return new NextResponse((error as { message?: string })?.message || "OAuth error", { status: 400 });
  }
});
