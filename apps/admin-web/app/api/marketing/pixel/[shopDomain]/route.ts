import { NextResponse } from "next/server";

import { getOrCreatePixelKey } from "../../../../../../../src/marketing/db/marketing.repository";
import { routeHandler } from "../../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../../lib/route-auth";

function normalizeShopDomain(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();
}

function resolveBaseUrl(req: Request) {
  const explicit = String(process.env.APP_HOST || "").trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const forwardedProto = String(req.headers.get("x-forwarded-proto") || "").split(",")[0];
  const forwardedHost = String(req.headers.get("x-forwarded-host") || "").split(",")[0];
  const url = new URL(req.url);
  const proto = forwardedProto || url.protocol.replace(/:$/, "") || "https";
  const host = forwardedHost || url.host || "";
  if (!host) {
    throw new Error("No se pudo resolver el host de la aplicacion.");
  }
  return `${proto}://${host}`.replace(/\/$/, "");
}

const MARKETING_TOPICS = [
  "ORDERS_CREATE",
  "ORDERS_PAID",
  "ORDERS_UPDATED",
  "CHECKOUTS_CREATE",
  "CHECKOUTS_UPDATE",
  "CUSTOMERS_CREATE",
];

export const GET = routeHandler(async (req: Request, ctx) => {
  await requireRouteAdmin();
  try {
    const params = (await (ctx.params ?? Promise.resolve({}))) as Record<string, string>;
    const shopDomain = normalizeShopDomain(params.shopDomain);
    if (!shopDomain) {
      return NextResponse.json({ error: "shopDomain requerido" }, { status: 400 });
    }
    const { pixelKey } = await getOrCreatePixelKey(shopDomain);
    const baseUrl = resolveBaseUrl(req);
    const pixelScriptUrl = `${baseUrl}/api/marketing/pixel.js?key=${encodeURIComponent(pixelKey)}`;
    const webhookUrl = `${baseUrl}/api/marketing/webhooks/shopify`;
    return NextResponse.json({
      shopDomain,
      pixelKey,
      pixelScriptUrl,
      pixelScriptTag: `<script src="${pixelScriptUrl}" async></script>`,
      webhookUrl,
      webhookTopics: MARKETING_TOPICS,
      envKeyConfigured: Boolean(String(process.env.MARKETING_PIXEL_KEY || "").trim()),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "pixel_config_error" }, { status: 400 });
  }
});
