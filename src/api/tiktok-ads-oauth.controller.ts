import type { Request, Response } from "express";
import { createOAuthState, consumeOAuthState } from "../services/oauth-state.service";
import { upsertTikTokAdsCredentials } from "../services/store-connections.service";
import { getAdsAppConfig } from "../services/ads-app-config.service";
import { getOrgId } from "../db";
import { isTenantModuleEnabled } from "../sa/sa.repository";

const TIKTOK_ADS_PROVIDER = "tiktok_ads";

type OAuthEnv = {
  appId: string;
  appSecret: string;
  appHost: string;
};

async function assertModuleEnabled() {
  const enabled = await isTenantModuleEnabled(getOrgId(), TIKTOK_ADS_PROVIDER);
  if (!enabled) {
    throw new Error("Modulo TikTok Ads desactivado por ApiFlujos.");
  }
}

async function ensureOAuthEnv(req: Request): Promise<OAuthEnv> {
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

export async function tiktokAdsOAuthStatus(req: Request, res: Response) {
  try {
    const env = await ensureOAuthEnv(req);
    res.status(200).json({ enabled: true, appHost: env.appHost, missing: [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Configuracion invalida";
    const missing = message.includes("Falta:") ? message.split("Falta:")[1].trim().split(",") : [];
    res.status(200).json({ enabled: false, missing, appHost: "" });
  }
}

export async function startTikTokAdsOAuth(req: Request, res: Response) {
  try {
    await assertModuleEnabled();
    const env = await ensureOAuthEnv(req);
    const advertiserId = String(req.query.advertiserId || "").trim();
    const shopDomain = String(req.query.shopDomain || "").trim();
    if (!advertiserId) {
      return res.status(400).send("TikTok Ads advertiserId requerido");
    }
    if (!shopDomain) {
      return res.status(400).send("Shop domain requerido");
    }
    const nonce = await createOAuthState(TIKTOK_ADS_PROVIDER, { advertiserId, shopDomain });
    const redirectUri = `${env.appHost}/auth/tiktok-ads/callback`;
    const scopes = "ads.read";
    const authorizeUrl =
      "https://business-api.tiktok.com/open_api/v1.3/oauth2/authorize/" +
      `?app_id=${encodeURIComponent(env.appId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${encodeURIComponent(nonce)}` +
      `&scope=${encodeURIComponent(scopes)}`;
    return res.redirect(authorizeUrl);
  } catch (error) {
    return res.status(500).send((error as { message?: string })?.message || "OAuth error");
  }
}

export async function tiktokAdsOAuthCallback(req: Request, res: Response) {
  try {
    await assertModuleEnabled();
    const env = await ensureOAuthEnv(req);
    if (req.query.error) {
      return res.status(400).send(String(req.query.error_description || req.query.error));
    }
    const code = String(req.query.code || "").trim();
    const state = String(req.query.state || "").trim();
    if (!code || !state) {
      return res.status(400).send("Missing OAuth params");
    }
    const stateResult = await consumeOAuthState(TIKTOK_ADS_PROVIDER, state);
    if (!stateResult.ok) {
      return res.status(400).send("State invalido");
    }
    const payload = stateResult.payload as { advertiserId?: string; shopDomain?: string } | null;
    const advertiserId = String(payload?.advertiserId || "").trim();
    const shopDomain = String(payload?.shopDomain || "").trim();
    if (!advertiserId) {
      return res.status(400).send("TikTok Ads advertiserId requerido");
    }
    if (!shopDomain) {
      return res.status(400).send("Shop domain requerido");
    }

    const redirectUri = `${env.appHost}/auth/tiktok-ads/callback`;
    const tokenResponse = await fetch(
      "https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_id: env.appId,
          secret: env.appSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      }
    );
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
    const expiresAt = new Date(Date.now() + Math.max(1, Number(tokenPayload.data.expires_in || 0)) * 1000).toISOString();
    await upsertTikTokAdsCredentials({
      accessToken,
      advertiserId,
      shopDomain,
      refreshToken,
      expiresAt,
    });
    const redirectUrl = new URL(`${env.appHost}/dashboard`);
    redirectUrl.searchParams.set("connections", "1");
    return res.redirect(redirectUrl.toString());
  } catch (error) {
    return res.status(400).send((error as { message?: string })?.message || "OAuth error");
  }
}
