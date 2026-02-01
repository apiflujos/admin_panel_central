import crypto from "crypto";
import type { Request, Response } from "express";
import { ShopifyClient } from "../connectors/shopify";
import { upsertStoreConnection } from "../services/store-connections.service";
import {
  createOAuthState,
  consumeOAuthState,
  isValidShopDomain,
  normalizeShopDomainForOAuth,
} from "../services/shopify-oauth.service";
import { registerShopifyWebhooks } from "./shopify-webhooks.controller";

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY || "";
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET || "";
const SHOPIFY_SCOPES = process.env.SHOPIFY_SCOPES || "";
const APP_HOST = (process.env.APP_HOST || "").replace(/\/$/, "");

function ensureOAuthEnv() {
  if (!SHOPIFY_API_KEY || !SHOPIFY_API_SECRET || !SHOPIFY_SCOPES || !APP_HOST) {
    throw new Error("OAuth env vars missing");
  }
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

function validateHmac(query: Record<string, unknown>) {
  const provided = String(query.hmac || "");
  if (!provided) return false;
  const message = buildHmacMessage(query);
  const digest = crypto
    .createHmac("sha256", SHOPIFY_API_SECRET)
    .update(message)
    .digest("hex");
  const digestBuffer = Buffer.from(digest, "utf8");
  const providedBuffer = Buffer.from(provided, "utf8");
  if (digestBuffer.length !== providedBuffer.length) return false;
  return crypto.timingSafeEqual(digestBuffer, providedBuffer);
}

export async function startShopifyOAuth(req: Request, res: Response) {
  try {
    ensureOAuthEnv();
    const shopParam = String(req.query.shop || "").trim();
    const storeNameParam = String(req.query.storeName || "").trim();
    if (!shopParam || !isValidShopDomain(shopParam)) {
      return res.status(400).send("Shop domain invalido");
    }
    const shop = normalizeShopDomainForOAuth(shopParam);
    const nonce = crypto.randomBytes(16).toString("hex");
    await createOAuthState(shop, nonce, storeNameParam || null);
    const redirectUri = `${APP_HOST}/auth/callback`;
    const authorizeUrl =
      `https://${shop}/admin/oauth/authorize` +
      `?client_id=${encodeURIComponent(SHOPIFY_API_KEY)}` +
      `&scope=${encodeURIComponent(SHOPIFY_SCOPES)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${encodeURIComponent(nonce)}`;
    return res.redirect(authorizeUrl);
  } catch (error) {
    return res.status(500).send((error as { message?: string })?.message || "OAuth error");
  }
}

export async function shopifyOAuthCallback(req: Request, res: Response) {
  try {
    ensureOAuthEnv();
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
    if (!validateHmac(req.query as Record<string, unknown>)) {
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
        client_id: SHOPIFY_API_KEY,
        client_secret: SHOPIFY_API_SECRET,
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
      scopes: tokenPayload.scope || SHOPIFY_SCOPES,
    });
    const client = new ShopifyClient({
      shopDomain: normalizedShop,
      accessToken,
    });
    await registerShopifyWebhooks({
      client,
      baseUrl: APP_HOST,
    });
    const redirectUrl = new URL(`${APP_HOST}/dashboard`);
    if (connectionResult?.isNew) {
      redirectUrl.searchParams.set("onboard", normalizedShop);
    }
    return res.redirect(redirectUrl.toString());
  } catch (error) {
    return res.status(400).send((error as { message?: string })?.message || "OAuth error");
  }
}
