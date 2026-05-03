import { NextResponse } from "next/server";

import { ShopifyClient } from "../../../../../../../src/connectors/shopify";
import { getShopifyConnectionByDomain } from "../../../../../../../src/services/store-connections.service";
import { routeHandler } from "../../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../../lib/route-auth";

const DEFAULT_TOPICS = [
  "ORDERS_CREATE",
  "ORDERS_UPDATED",
  "ORDERS_PAID",
  "REFUNDS_CREATE",
  "INVENTORY_LEVELS_UPDATE",
  "PRODUCTS_CREATE",
  "PRODUCTS_UPDATE",
];

function resolveBaseUrl(req: Request) {
  const explicit = process.env.APP_HOST || "";
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

function normalizeUrl(value: string) {
  return value.replace(/\/$/, "").toLowerCase();
}

export const GET = routeHandler(async (req: Request) => {
  await requireRouteAdmin();
  try {
    const shopDomain = String(new URL(req.url).searchParams.get("shopDomain") || "").trim();
    const connection = await getShopifyConnectionByDomain(shopDomain);
    const baseUrl = resolveBaseUrl(req);
    const client = new ShopifyClient({
      shopDomain: connection.shopDomain,
      accessToken: connection.accessToken,
    });
    const data = await client.listWebhookSubscriptions(50);
    const edges = data.webhookSubscriptions?.edges || [];
    const expectedCallback = normalizeUrl(`${baseUrl}/api/webhooks/shopify`);
    const topics = new Set<string>();
    edges.forEach((edge) => {
      const node = edge.node;
      const endpointUrl = node.endpoint?.callbackUrl || "";
      if (endpointUrl && normalizeUrl(endpointUrl) === expectedCallback) {
        topics.add(String(node.topic));
      }
    });
    const missing = DEFAULT_TOPICS.filter((topic) => !topics.has(topic));
    return NextResponse.json({
      ok: missing.length === 0,
      total: DEFAULT_TOPICS.length,
      connected: topics.size,
      missing,
      callbackUrl: `${baseUrl}/api/webhooks/shopify`,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as { message?: string })?.message || "error" }, { status: 400 });
  }
});
