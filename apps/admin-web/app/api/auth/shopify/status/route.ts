import { NextResponse } from "next/server";

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
  const apiKey = String(process.env.SHOPIFY_API_KEY || "").trim();
  const apiSecret = String(process.env.SHOPIFY_API_SECRET || "").trim();
  const scopes = String(process.env.SHOPIFY_SCOPES || "").trim();
  const appHost = resolveAppHost(req);
  const missing: string[] = [];
  if (!apiKey) missing.push("SHOPIFY_API_KEY");
  if (!apiSecret) missing.push("SHOPIFY_API_SECRET");
  if (!scopes) missing.push("SHOPIFY_SCOPES");
  if (!appHost) missing.push("APP_HOST");
  return NextResponse.json({
    enabled: missing.length === 0,
    missing,
    appHost,
  });
});
