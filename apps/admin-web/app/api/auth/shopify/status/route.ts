import { NextResponse } from "next/server";

import { resolveShopifyOAuthConfig } from "../../../../../../../src/services/shopify-app-credentials.service";
import { routeHandler } from "../../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../../lib/route-auth";

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

export const GET = routeHandler(async (req: Request) => {
  await requireRouteAdmin();
  const storeIdParam = Number(new URL(req.url).searchParams.get("storeId") || "");
  const storeId = Number.isFinite(storeIdParam) && storeIdParam > 0 ? storeIdParam : null;
  const { apiKey, apiSecret, scopes } = await resolveShopifyOAuthConfig(storeId);
  const appHost = resolveAppHost(req);
  const missing: string[] = [];
  if (!apiKey) missing.push("Client ID en base de datos");
  if (!apiSecret) missing.push("Client secret en base de datos");
  if (!scopes) missing.push("permisos OAuth en base de datos");
  if (!appHost) missing.push("APP_HOST");
  return NextResponse.json({
    enabled: missing.length === 0,
    missing,
    appHost,
  });
});
