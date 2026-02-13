import type { Request, Response } from "express";
import { createOAuthState, consumeOAuthState } from "../services/oauth-state.service";
import { upsertMetaAdsCredentials } from "../services/store-connections.service";
import { getAdsAppConfig } from "../services/ads-app-config.service";
import { getOrgId } from "../db";
import { isTenantModuleEnabled } from "../sa/sa.repository";

const META_ADS_PROVIDER = "meta_ads";

type OAuthEnv = {
  appId: string;
  appSecret: string;
  appHost: string;
};

async function assertModuleEnabled() {
  const enabled = await isTenantModuleEnabled(getOrgId(), META_ADS_PROVIDER);
  if (!enabled) {
    throw new Error("Modulo Meta Ads desactivado por ApiFlujos.");
  }
}

async function ensureOAuthEnv(req: Request): Promise<OAuthEnv> {
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

export async function metaAdsOAuthStatus(req: Request, res: Response) {
  try {
    const env = await ensureOAuthEnv(req);
    res.status(200).json({ enabled: true, appHost: env.appHost, missing: [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Configuracion invalida";
    const missing = message.includes("Falta:") ? message.split("Falta:")[1].trim().split(",") : [];
    res.status(200).json({ enabled: false, missing, appHost: "" });
  }
}

export async function startMetaAdsOAuth(req: Request, res: Response) {
  try {
    await assertModuleEnabled();
    const env = await ensureOAuthEnv(req);
    const adAccountId = String(req.query.adAccountId || "").trim();
    const shopDomain = String(req.query.shopDomain || "").trim();
    if (!adAccountId) {
      return res.status(400).send("Meta Ads adAccountId requerido");
    }
    if (!shopDomain) {
      return res.status(400).send("Shop domain requerido");
    }
    const nonce = await createOAuthState(META_ADS_PROVIDER, { adAccountId, shopDomain });
    const redirectUri = `${env.appHost}/auth/meta-ads/callback`;
    const scopes = "ads_read,read_insights";
    const authorizeUrl =
      "https://www.facebook.com/v19.0/dialog/oauth" +
      `?client_id=${encodeURIComponent(env.appId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${encodeURIComponent(nonce)}` +
      `&scope=${encodeURIComponent(scopes)}`;
    return res.redirect(authorizeUrl);
  } catch (error) {
    return res.status(500).send((error as { message?: string })?.message || "OAuth error");
  }
}

export async function metaAdsOAuthCallback(req: Request, res: Response) {
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
    const stateResult = await consumeOAuthState(META_ADS_PROVIDER, state);
    if (!stateResult.ok) {
      return res.status(400).send("State invalido");
    }
    const payload = stateResult.payload as { adAccountId?: string; shopDomain?: string } | null;
    const adAccountId = String(payload?.adAccountId || "").trim();
    const shopDomain = String(payload?.shopDomain || "").trim();
    if (!adAccountId) {
      return res.status(400).send("Meta Ads adAccountId requerido");
    }
    if (!shopDomain) {
      return res.status(400).send("Shop domain requerido");
    }

    const redirectUri = `${env.appHost}/auth/meta-ads/callback`;
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
    const redirectUrl = new URL(`${env.appHost}/dashboard`);
    redirectUrl.searchParams.set("connections", "1");
    return res.redirect(redirectUrl.toString());
  } catch (error) {
    return res.status(400).send((error as { message?: string })?.message || "OAuth error");
  }
}
