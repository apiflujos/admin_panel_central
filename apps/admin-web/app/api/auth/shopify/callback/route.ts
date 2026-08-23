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
import { routeHandler } from "../../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../../lib/route-auth";

type OAuthEnv = {
  apiKey: string;
  apiSecret: string;
  scopes: string;
  appHost: string;
};

const DEFAULT_TOPICS = [
  "ORDERS_CREATE",
  "ORDERS_UPDATED",
  "ORDERS_PAID",
  "REFUNDS_CREATE",
  "INVENTORY_LEVELS_UPDATE",
  "PRODUCTS_CREATE",
  "PRODUCTS_UPDATE",
];

async function assertModuleEnabled(moduleKey: string) {
  const enabled = await isTenantModuleEnabled(getOrgId(), moduleKey);
  if (!enabled) {
    throw new Error(`Modulo ${moduleKey} desactivado por ApiFlujos.`);
  }
}

function resolveAppHost(_req: Request) {
  const explicit = String(process.env.APP_HOST || "").trim();
  if (!explicit) return "";
  return explicit.replace(/\/$/, "");
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
  const provided = String(searchParams.get("hmac") || "")
    .trim()
    .toLowerCase();
  if (!provided || !/^[a-f0-9]+$/.test(provided)) return false;
  const message = buildHmacMessage(searchParams);
  const digest = crypto.createHmac("sha256", apiSecret).update(message).digest("hex");
  let digestBuffer: Buffer;
  let providedBuffer: Buffer;
  try {
    digestBuffer = Buffer.from(digest, "hex");
    providedBuffer = Buffer.from(provided, "hex");
  } catch {
    return false;
  }
  if (digestBuffer.length !== providedBuffer.length || digestBuffer.length === 0) return false;
  return crypto.timingSafeEqual(digestBuffer, providedBuffer);
}

async function registerShopifyWebhooks(params: { client: ShopifyClient; baseUrl: string }) {
  const baseUrl = params.baseUrl.replace(/\/$/, "");
  const callbackUrl = `${baseUrl}/api/webhooks/shopify`;
  const results = await Promise.all(
    DEFAULT_TOPICS.map(async (topic) => {
      try {
        const data = await params.client.createWebhookSubscription(topic, callbackUrl);
        const response = data?.webhookSubscriptionCreate;
        if (!response) {
          return {
            topic,
            ok: false,
            errors: [{ message: "GraphQL vacío o throttled" }],
          };
        }
        const errors = response.userErrors || [];
        return {
          topic,
          ok: errors.length === 0,
          errors,
        };
      } catch (error) {
        return {
          topic,
          ok: false,
          errors: [{ message: (error as { message?: string })?.message || "error" }],
        };
      }
    })
  );
  return {
    ok: results.every((item) => item.ok),
    callbackUrl,
    items: results,
    failedTopics: results.filter((r) => !r.ok).map((r) => r.topic),
  };
}

export const GET = routeHandler(async (req: Request) => {
  const user = await requireRouteAdmin();
  try {
    await assertModuleEnabled("shopify");
    const env = ensureOAuthEnv(req);
    const searchParams = new URL(req.url).searchParams;
    if (searchParams.get("error")) {
      return new NextResponse(String(searchParams.get("error_description") || searchParams.get("error")), {
        status: 400,
      });
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
    const stateResult = await consumeOAuthState(shop, state, user.id);
    if (!stateResult.ok) {
      const reason = stateResult.reason === "user_mismatch" ? "State pertenece a otro usuario" : "State invalido";
      return new NextResponse(reason, { status: 400 });
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
    const webhookResult = await registerShopifyWebhooks({
      client,
      baseUrl: env.appHost,
    });
    const redirectUrl = new URL("/settings/connections", req.url);
    redirectUrl.searchParams.set("connections", "1");
    if ((connectionResult as { isNew?: boolean })?.isNew) {
      redirectUrl.searchParams.set("onboard", normalizedShop);
    }
    if (!webhookResult.ok && webhookResult.failedTopics.length) {
      redirectUrl.searchParams.set("webhooks_pending", webhookResult.failedTopics.join(","));
    }
    return NextResponse.redirect(redirectUrl.toString(), { status: 302 });
  } catch (error) {
    const msg = encodeURIComponent((error as { message?: string })?.message || "OAuth error");
    const redirectUrl = new URL("/settings/connections", req.url);
    redirectUrl.searchParams.set("oauth_error", msg);
    return NextResponse.redirect(redirectUrl.toString(), { status: 302 });
  }
});
