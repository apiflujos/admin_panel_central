import { NextResponse } from "next/server";

import { ShopifyClient } from "../../../../../../../src/connectors/shopify";
import { getShopifyConnectionByDomain } from "../../../../../../../src/services/store-connections.service";
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

function normalizeUrl(value: string) {
  return value.replace(/\/$/, "").toLowerCase();
}

export const GET = routeHandler(async (req: Request) => {
  await requireRouteAdmin();
  try {
    const searchParams = new URL(req.url).searchParams;
    const shopDomain = normalizeShopDomain(searchParams.get("shopDomain"));
    if (!shopDomain) {
      return NextResponse.json({ error: "shopDomain requerido" }, { status: 400 });
    }
    const connection = await getShopifyConnectionByDomain(shopDomain);
    const baseUrl = resolveBaseUrl(req);
    const client = new ShopifyClient({
      shopDomain: connection.shopDomain,
      accessToken: connection.accessToken,
    });
    const data = await client.listWebhookSubscriptions(50);
    const edges = (data as { webhookSubscriptions?: { edges?: Array<{ node: { endpoint?: { callbackUrl?: string }; topic?: string } }> } }).webhookSubscriptions?.edges || [];
    const expectedCallback = normalizeUrl(`${baseUrl}/api/marketing/webhooks/shopify`);
    const topics = new Set<string>();
    edges.forEach((edge) => {
      const node = edge.node;
      const endpointUrl = node.endpoint?.callbackUrl || "";
      if (endpointUrl && normalizeUrl(endpointUrl) === expectedCallback) {
        topics.add(String(node.topic));
      }
    });
    const missing = MARKETING_TOPICS.filter((topic) => !topics.has(topic));
    return NextResponse.json({
      ok: missing.length === 0,
      total: MARKETING_TOPICS.length,
      connected: topics.size,
      missing,
      callbackUrl: `${baseUrl}/api/marketing/webhooks/shopify`,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "error" }, { status: 400 });
  }
});
