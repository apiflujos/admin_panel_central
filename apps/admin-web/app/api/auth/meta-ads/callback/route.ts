import { NextResponse } from "next/server";

import { getOrgId } from "../../../../../../../src/db";
import { isTenantModuleEnabled } from "../../../../../../../src/sa/sa.repository";
import { getAdsAppConfig } from "../../../../../../../src/services/ads-app-config.service";
import { consumeOAuthState } from "../../../../../../../src/services/oauth-state.service";
import { upsertMetaAdsCredentials } from "../../../../../../../src/services/store-connections.service";
import { routeHandler } from "../../../../../lib/route-handler";

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
    const stateResult = await consumeOAuthState(META_ADS_PROVIDER, state);
    if (!stateResult.ok) {
      return new NextResponse("State invalido", { status: 400 });
    }
    const payload = stateResult.payload as { adAccountId?: string; shopDomain?: string } | null;
    const adAccountId = String(payload?.adAccountId || "").trim();
    const shopDomain = String(payload?.shopDomain || "").trim();
    if (!adAccountId) {
      return new NextResponse("Meta Ads adAccountId requerido", { status: 400 });
    }
    if (!shopDomain) {
      return new NextResponse("Shop domain requerido", { status: 400 });
    }

    const redirectUri = `${env.appHost}/api/auth/meta-ads/callback`;
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
        new URLSearchParams({
          client_id: env.appId,
          client_secret: env.appSecret,
          redirect_uri: redirectUri,
          code,
        })
    );
    if (!tokenResponse.ok) {
      const text = await tokenResponse.text();
      throw new Error(text || "No se pudo obtener access token");
    }
    const tokenPayload = (await tokenResponse.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    const shortToken = String(tokenPayload.access_token || "").trim();
    if (!shortToken) {
      throw new Error("Access token vacio");
    }
    const longTokenResponse = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
        new URLSearchParams({
          grant_type: "fb_exchange_token",
          client_id: env.appId,
          client_secret: env.appSecret,
          fb_exchange_token: shortToken,
        })
    );
    if (!longTokenResponse.ok) {
      const text = await longTokenResponse.text();
      throw new Error(text || "No se pudo extender access token");
    }
    const longPayload = (await longTokenResponse.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    const accessToken = String(longPayload.access_token || "").trim();
    if (!accessToken) {
      throw new Error("Access token vacio");
    }
    const expiresAt = new Date(Date.now() + Math.max(1, Number(longPayload.expires_in || 0)) * 1000).toISOString();
    await upsertMetaAdsCredentials({
      accessToken,
      expiresAt,
      adAccountId,
      shopDomain,
    });
    const redirectUrl = new URL("/settings/connections", req.url);
    redirectUrl.searchParams.set("connections", "1");
    return NextResponse.redirect(redirectUrl.toString(), { status: 302 });
  } catch (error) {
    return new NextResponse((error as { message?: string })?.message || "OAuth error", { status: 400 });
  }
});
