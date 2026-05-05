import { NextResponse } from "next/server";

import { getOrgId, getPool } from "../../../../../../../src/db";
import { isTenantModuleEnabled } from "../../../../../../../src/sa/sa.repository";
import { getAdsAppConfig } from "../../../../../../../src/services/ads-app-config.service";
import { consumeOAuthState } from "../../../../../../../src/services/oauth-state.service";
import { readGoogleAdsCredentials, upsertGoogleAdsCredentials } from "../../../../../../../src/services/store-connections.service";
import { routeHandler } from "../../../../../lib/route-handler";

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
    const stateResult = await consumeOAuthState(GOOGLE_ADS_PROVIDER, state);
    if (!stateResult.ok) {
      return new NextResponse("State invalido", { status: 400 });
    }
    const payload = stateResult.payload as { customerId?: string; shopDomain?: string } | null;
    const customerId = String(payload?.customerId || "").trim();
    const shopDomain = String(payload?.shopDomain || "").trim();
    if (!customerId) {
      return new NextResponse("Google Ads customerId requerido", { status: 400 });
    }
    if (!shopDomain) {
      return new NextResponse("Shop domain requerido", { status: 400 });
    }
    const redirectUri = `${env.appHost}/api/auth/google-ads/callback`;
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.clientId,
        client_secret: env.clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenResponse.ok) {
      const text = await tokenResponse.text();
      throw new Error(text || "No se pudo obtener access token");
    }
    const tokenPayload = (await tokenResponse.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    const accessToken = String(tokenPayload.access_token || "").trim();
    if (!accessToken) {
      throw new Error("Access token vacio");
    }
    const pool = getPool();
    const orgId = getOrgId();
    const previous = await readGoogleAdsCredentials(pool, orgId);
    const refreshToken = String(tokenPayload.refresh_token || previous?.refreshToken || "").trim();
    if (!refreshToken) {
      throw new Error("Refresh token vacio. Reintenta con prompt=consent.");
    }
    const expiresAt = new Date(Date.now() + Math.max(1, Number(tokenPayload.expires_in || 0)) * 1000).toISOString();
    await upsertGoogleAdsCredentials({
      refreshToken,
      accessToken,
      expiresAt,
      customerId,
      shopDomain,
      loginCustomerId: previous?.loginCustomerId || null,
    });
    const redirectUrl = new URL("/settings/connections", req.url);
    redirectUrl.searchParams.set("connections", "1");
    return NextResponse.redirect(redirectUrl.toString(), { status: 302 });
  } catch (error) {
    return new NextResponse((error as { message?: string })?.message || "OAuth error", { status: 400 });
  }
});
