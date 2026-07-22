import crypto from "crypto";
import { NextResponse } from "next/server";

import { ShopifyClient } from "../../../../../../src/connectors/shopify";
import { getOrgId } from "../../../../../../src/db";
import { isTenantModuleEnabled } from "../../../../../../src/sa/sa.repository";
import { getStoreById } from "../../../../../../src/services/stores.service";
import {
  createOAuthState,
  isValidShopDomain,
  normalizeShopDomainForOAuth,
} from "../../../../../../src/services/shopify-oauth.service";
import { routeHandler } from "../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../lib/route-auth";

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
    const err = new Error(
      `El flow OAuth de Shopify no está configurado en este deploy. Faltan variables de entorno: ${missing.join(
        ", "
      )}. Alternativa: en el wizard elegí "Conectar con access token manual" y pegá el access_token de una custom app creada en tu tienda Shopify.`
    );
    (err as { statusCode?: number }).statusCode = 501;
    throw err;
  }

  return { apiKey, apiSecret, scopes, appHost };
}

export const GET = routeHandler(async (req: Request) => {
  const user = await requireRouteAdmin();
  try {
    await assertModuleEnabled("shopify");
    const env = ensureOAuthEnv(req);
    const searchParams = new URL(req.url).searchParams;
    const shopParam = String(searchParams.get("shop") || "").trim();
    const storeNameParam = String(searchParams.get("storeName") || "").trim();
    const storeIdParam = Number(searchParams.get("storeId") || "");
    const alegraAccountIdParam = Number(searchParams.get("alegraAccountId") || "");
    if (!shopParam || !isValidShopDomain(shopParam)) {
      return new NextResponse("Shop domain invalido", { status: 400 });
    }
    const shop = normalizeShopDomainForOAuth(shopParam);
    const nonce = crypto.randomBytes(16).toString("hex");
    let resolvedStoreName = storeNameParam || null;
    const storeId = Number.isFinite(storeIdParam) ? storeIdParam : null;
    const alegraAccountId = Number.isFinite(alegraAccountIdParam) ? alegraAccountIdParam : null;
    if (!resolvedStoreName && storeId) {
      const store = await getStoreById(storeId);
      resolvedStoreName = store?.name || null;
    }
    await createOAuthState(shop, nonce, resolvedStoreName || null, storeId, alegraAccountId, user.id);
    const redirectUri = `${env.appHost}/api/auth/shopify/callback`;
    const authorizeUrl =
      `https://${shop}/admin/oauth/authorize` +
      `?client_id=${encodeURIComponent(env.apiKey)}` +
      `&scope=${encodeURIComponent(env.scopes)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${encodeURIComponent(nonce)}`;
    return NextResponse.redirect(authorizeUrl, { status: 302 });
  } catch (error) {
    return new NextResponse((error as { message?: string })?.message || "OAuth error", { status: 500 });
  }
});
