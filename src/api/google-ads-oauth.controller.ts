import type { Request, Response } from "express";
import { createOAuthState, consumeOAuthState } from "../services/oauth-state.service";
import { getOrgId, getPool } from "../db";
import { getAdsAppConfig } from "../services/ads-app-config.service";
import { readGoogleAdsCredentials, upsertGoogleAdsCredentials } from "../services/store-connections.service";

const GOOGLE_ADS_PROVIDER = "google_ads";

type OAuthEnv = {
  clientId: string;
  clientSecret: string;
  appHost: string;
};

async function ensureOAuthEnv(req: Request): Promise<OAuthEnv> {
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

export async function googleAdsOAuthStatus(req: Request, res: Response) {
  try {
    const env = await ensureOAuthEnv(req);
    res.status(200).json({ enabled: true, appHost: env.appHost, missing: [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Configuracion invalida";
    const missing = message.includes("Falta:") ? message.split("Falta:")[1].trim().split(",") : [];
    res.status(200).json({ enabled: false, missing, appHost: "" });
  }
}

export async function startGoogleAdsOAuth(req: Request, res: Response) {
  try {
    const env = await ensureOAuthEnv(req);
    const customerId = String(req.query.customerId || "").trim();
    const shopDomain = String(req.query.shopDomain || "").trim();
    if (!customerId) {
      return res.status(400).send("Google Ads customerId requerido");
    }
    if (!shopDomain) {
      return res.status(400).send("Shop domain requerido");
    }
    const nonce = await createOAuthState(GOOGLE_ADS_PROVIDER, { customerId, shopDomain });
    const redirectUri = `${env.appHost}/auth/google-ads/callback`;
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
    return res.redirect(authorizeUrl);
  } catch (error) {
    return res.status(500).send((error as { message?: string })?.message || "OAuth error");
  }
}

export async function googleAdsOAuthCallback(req: Request, res: Response) {
  try {
    const env = await ensureOAuthEnv(req);
    if (req.query.error) {
      return res.status(400).send(String(req.query.error_description || req.query.error));
    }
    const code = String(req.query.code || "").trim();
    const state = String(req.query.state || "").trim();
    if (!code || !state) {
      return res.status(400).send("Missing OAuth params");
    }
    const stateResult = await consumeOAuthState(GOOGLE_ADS_PROVIDER, state);
    if (!stateResult.ok) {
      return res.status(400).send("State invalido");
    }
    const payload = stateResult.payload as { customerId?: string; shopDomain?: string } | null;
    const customerId = String(payload?.customerId || "").trim();
    const shopDomain = String(payload?.shopDomain || "").trim();
    if (!customerId) {
      return res.status(400).send("Google Ads customerId requerido");
    }
    if (!shopDomain) {
      return res.status(400).send("Shop domain requerido");
    }
    const redirectUri = `${env.appHost}/auth/google-ads/callback`;
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
    const redirectUrl = new URL(`${env.appHost}/dashboard`);
    redirectUrl.searchParams.set("connections", "1");
    return res.redirect(redirectUrl.toString());
  } catch (error) {
    return res.status(400).send((error as { message?: string })?.message || "OAuth error");
  }
}
