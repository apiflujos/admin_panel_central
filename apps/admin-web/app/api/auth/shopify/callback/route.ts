import crypto from "crypto";
import { NextResponse } from "next/server";

import { ShopifyClient } from "../../../../../../../src/connectors/shopify";
import { getOrgId } from "../../../../../../../src/db";
import { isTenantModuleEnabled } from "../../../../../../../src/sa/sa.repository";
import { upsertStoreConnection } from "../../../../../../../src/services/store-connections.service";
import { getStoreById } from "../../../../../../../src/services/stores.service";
import {
  consumeOAuthState,
  isValidShopDomain,
  normalizeShopDomainForOAuth,
} from "../../../../../../../src/services/shopify-oauth.service";
import { resolveShopifyApiVersion } from "../../../../../../../src/utils/shopify";
import { registerShopifyWebhooks } from "../../../../../../integration-api/src/modules/webhooks/handlers/core-shopify-webhooks";
import { routeHandler } from "../../../../../lib/route-handler";

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

function resolveAppHost(req: Request) {
  const explicit = String(process.env.APP_HOST || "").trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const forwardedProto = String(req.headers.get("x-forwarded-proto") || "")
    .split(",")[0]
    .trim();
  const forwardedHost = String(req.headers.get("x-forwarded-host") || "")
    .split(",")[0]
    .trim();
  const url = new URL(req.url);
  const proto = forwardedProto || url.protocol.replace(/:$/, "") || "https";
  const host = String(forwardedHost || url.host || "").trim();
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

function buildHmacMessage(searchParams: URLSearchParams) {
  const entries: Array<[string, string]> = [];
  for (const [key, value] of searchParams.entries()) {
    if (key === "hmac" || key === "signature") continue;
    entries.push([key, value]);
  }
  entries.sort((a, b) => a[0].localeCompare(b[0]));
  return entries.map(([key, value]) => `${key}=${value}`).join("&");
}

function validateHmac(searchParams: URLSearchParams, apiSecret: string) {
  const provided = String(searchParams.get("hmac") || "");
  if (!provided) return false;
  const message = buildHmacMessage(searchParams);
  const digest = crypto.createHmac("sha256", apiSecret).update(message).digest("hex");
  const digestBuffer = Buffer.from(digest, "utf8");
  const providedBuffer = Buffer.from(provided, "utf8");
  if (digestBuffer.length !== providedBuffer.length) return false;
  return crypto.timingSafeEqual(digestBuffer, providedBuffer);
}

export const GET = routeHandler(async (req: Request) => {
  try {
    await assertModuleEnabled("shopify");
    const env = ensureOAuthEnv(req);
    const searchParams = new URL(req.url).searchParams;
    if (searchParams.get("error")) {
      return new NextResponse(
        String(searchParams.get("error_description") || searchParams.get("error")),
        { status: 400 }
      );
    }
    const shop = String(searchParams.get("shop") || "").trim();
    const code = String(searchParams.get("code") || "").trim();
    const state = String(searchParams.get("state") || "").trim();
    if (!shop || !code || !state) {
      return new NextResponse("Missing OAuth params", { status: 400 });
    }
    if (!isValidShopDomain(shop)) {
      return new NextResponse("Shop domain invalido", { status: 400 });
    }
    if (!validateHmac(searchParams, env.apiSecret)) {
      return new NextResponse("HMAC invalido", { status: 400 });
    }
    const stateResult = await consumeOAuthState(shop, state);
    if (!stateResult.ok) {
      return new NextResponse("State invalido", { status: 400 });
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
    let storeName = stateResult.storeName || normalizedShop;
    if (stateResult.storeId) {
      const store = await getStoreById(stateResult.storeId);
      if (store?.name) storeName = store.name;
    }
    const client = new ShopifyClient({
      shopDomain: normalizedShop,
      accessToken,
    });
    const locationId = await client.getPrimaryLocationId().catch(() => "");
    const connectionResult = await upsertStoreConnection({
      shopDomain: normalizedShop,
      accessToken,
      locationId: locationId || undefined,
      apiVersion: resolveShopifyApiVersion(undefined),
      storeName,
      storeId: stateResult.storeId || undefined,
      scopes: tokenPayload.scope || env.scopes,
      alegra: stateResult.alegraAccountId ? { accountId: stateResult.alegraAccountId } : undefined,
    });
    await registerShopifyWebhooks({
      client,
      baseUrl: env.appHost,
    });
    const redirectUrl = new URL(`${env.appHost}/dashboard`);
    if ((connectionResult as { isNew?: boolean })?.isNew) {
      redirectUrl.searchParams.set("onboard", normalizedShop);
    }
    return NextResponse.redirect(redirectUrl.toString(), { status: 302 });
  } catch (error) {
    const msg = encodeURIComponent((error as { message?: string })?.message || "OAuth error");
    const appHost = String(process.env.APP_HOST || "").trim();
    if (appHost) {
      return NextResponse.redirect(`${appHost}/dashboard?oauth_error=${msg}`, { status: 302 });
    }
    return new NextResponse((error as { message?: string })?.message || "OAuth error", { status: 400 });
  }
});
