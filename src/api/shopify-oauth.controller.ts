import crypto from "crypto";
import type { Request, Response } from "express";
import { ShopifyClient } from "../connectors/shopify";
import { getOrgId } from "../db";
import { isTenantModuleEnabled } from "../sa/sa.repository";
import { upsertStoreConnection } from "../services/store-connections.service";
import {
  createOAuthState,
  consumeOAuthState,
  isValidShopDomain,
  normalizeShopDomainForOAuth,
} from "../services/shopify-oauth.service";
import { registerShopifyWebhooks } from "./shopify-webhooks.controller";

type OAuthEnv = {
  apiKey: string;
  apiSecret: string;
  scopes: string;
  appHost: string;
};

async function assertModuleEnabled(moduleKey: string) {
  const enabled = await isTenantModuleEnabled(getOrgId(), moduleKey);
  if (!enabled) {
    throw new Error(`Modulo ${moduleKey} desactivado por ApiFlujos.`);
  }
}

export function shopifyOAuthStatus(req: Request, res: Response) {
  const apiKey = String(process.env.SHOPIFY_API_KEY || "").trim();
  const apiSecret = String(process.env.SHOPIFY_API_SECRET || "").trim();
  const scopes = String(process.env.SHOPIFY_SCOPES || "").trim();
  const appHost = resolveAppHost(req);
  const missing: string[] = [];
  if (!apiKey) missing.push("SHOPIFY_API_KEY");
  if (!apiSecret) missing.push("SHOPIFY_API_SECRET");
  if (!scopes) missing.push("SHOPIFY_SCOPES");
  if (!appHost) missing.push("APP_HOST");
  res.status(200).json({
    enabled: missing.length === 0,
    missing,
    appHost,
  });
}

function resolveAppHost(req: Request) {
  const explicit = String(process.env.APP_HOST || "").trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const forwardedHost = String(req.headers["x-forwarded-host"] || "").split(",")[0].trim();
  const proto = forwardedProto || req.protocol || "https";
  const host = forwardedHost || String(req.headers.host || "").trim();
  if (!host) return "";
  return `${proto}://${host}`.replace(/\/$/, "");
}

function ensureOAuthEnv(req: Request): OAuthEnv {
  const apiKey = String(process.env.SHOPIFY_API_KEY || "").trim();
  const apiSecret = String(process.env.SHOPIFY_API_SECRET || "").trim();
  const scopes = String(process.env.SHOPIFY_SCOPES || "").trim();
  const appHost = resolveAppHost(req);

  const missing: string[] = [];
  if (!apiKey) missing.push("SHOPIFY_API_KEY");
  if (!apiSecret) missing.push("SHOPIFY_API_SECRET");
  if (!scopes) missing.push("SHOPIFY_SCOPES");
  if (!appHost) missing.push("APP_HOST");
  if (missing.length) {
    throw new Error(`Configuracion OAuth incompleta. Falta: ${missing.join(", ")}`);
  }

  return { apiKey, apiSecret, scopes, appHost };
}

function buildHmacMessage(query: Record<string, unknown>) {
  const entries: Array<[string, string]> = [];
  Object.entries(query).forEach(([key, value]) => {
    if (key === "hmac" || key === "signature") return;
    if (Array.isArray(value)) {
      value.forEach((item) => entries.push([key, String(item)]));
    } else if (value !== undefined) {
      entries.push([key, String(value)]);
    }
  });
  entries.sort((a, b) => a[0].localeCompare(b[0]));
  return entries.map(([key, value]) => `${key}=${value}`).join("&");
}

function validateHmac(query: Record<string, unknown>, apiSecret: string) {
  const provided = String(query.hmac || "");
  if (!provided) return false;
  const message = buildHmacMessage(query);
  const digest = crypto
    .createHmac("sha256", apiSecret)
    .update(message)
    .digest("hex");
  const digestBuffer = Buffer.from(digest, "utf8");
  const providedBuffer = Buffer.from(provided, "utf8");
  if (digestBuffer.length !== providedBuffer.length) return false;
  return crypto.timingSafeEqual(digestBuffer, providedBuffer);
}

export async function startShopifyOAuth(req: Request, res: Response) {
  try {
    await assertModuleEnabled("shopify");
    const env = ensureOAuthEnv(req);
    const shopParam = String(req.query.shop || "").trim();
    const storeNameParam = String(req.query.storeName || "").trim();
    if (!shopParam || !isValidShopDomain(shopParam)) {
      return res.status(400).send("Shop domain invalido");
    }
    const shop = normalizeShopDomainForOAuth(shopParam);
    const nonce = crypto.randomBytes(16).toString("hex");
    await createOAuthState(shop, nonce, storeNameParam || null);
    const redirectUri = `${env.appHost}/auth/callback`;
    const authorizeUrl =
      `https://${shop}/admin/oauth/authorize` +
      `?client_id=${encodeURIComponent(env.apiKey)}` +
      `&scope=${encodeURIComponent(env.scopes)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${encodeURIComponent(nonce)}`;
    return res.redirect(authorizeUrl);
  } catch (error) {
    return res.status(500).send((error as { message?: string })?.message || "OAuth error");
  }
}

export async function shopifyOAuthCallback(req: Request, res: Response) {
  try {
    await assertModuleEnabled("shopify");
    const env = ensureOAuthEnv(req);
    if (req.query.error) {
      return res.status(400).send(String(req.query.error_description || req.query.error));
    }
    const shop = String(req.query.shop || "").trim();
    const code = String(req.query.code || "").trim();
    const state = String(req.query.state || "").trim();
    if (!shop || !code || !state) {
      return res.status(400).send("Missing OAuth params");
    }
    if (!isValidShopDomain(shop)) {
      return res.status(400).send("Shop domain invalido");
    }
    if (!validateHmac(req.query as Record<string, unknown>, env.apiSecret)) {
      return res.status(400).send("HMAC invalido");
    }
    const stateResult = await consumeOAuthState(shop, state);
    if (!stateResult.ok) {
      return res.status(400).send("State invalido");
    }
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: env.apiKey,
        client_secret: env.apiSecret,
        code,
      }),
    });
    if (!tokenResponse.ok) {
      const text = await tokenResponse.text();
      throw new Error(text || "No se pudo obtener access token");
    }
    const tokenPayload = (await tokenResponse.json()) as {
      access_token?: string;
      scope?: string;
    };
    const accessToken = String(tokenPayload.access_token || "").trim();
    if (!accessToken) {
      throw new Error("Access token vacio");
    }
    const normalizedShop = normalizeShopDomainForOAuth(shop);
    const storeName = stateResult.storeName || normalizedShop;
    const connectionResult = await upsertStoreConnection({
      shopDomain: normalizedShop,
      accessToken,
      storeName,
      scopes: tokenPayload.scope || env.scopes,
    });
    const client = new ShopifyClient({
      shopDomain: normalizedShop,
      accessToken,
    });
    await registerShopifyWebhooks({
      client,
      baseUrl: env.appHost,
    });
    const redirectUrl = new URL(`${env.appHost}/dashboard`);
    if (connectionResult?.isNew) {
      redirectUrl.searchParams.set("onboard", normalizedShop);
    }
    return res.redirect(redirectUrl.toString());
  } catch (error) {
    return res.status(400).send((error as { message?: string })?.message || "OAuth error");
  }
}
