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

export const POST = routeHandler(async (req: Request) => {
  await requireRouteAdmin();
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const shopDomain = normalizeShopDomain(body.shopDomain);
    if (!shopDomain) {
      return NextResponse.json({ error: "shopDomain requerido" }, { status: 400 });
    }
    const connection = await getShopifyConnectionByDomain(shopDomain);
    const baseUrl = resolveBaseUrl(req);
    const callbackUrl = `${baseUrl}/api/marketing/webhooks/shopify`;
    const client = new ShopifyClient({
      shopDomain: connection.shopDomain,
      accessToken: connection.accessToken,
    });
    const results = await Promise.all(
      MARKETING_TOPICS.map(async (topic) => {
        try {
          const data = await client.createWebhookSubscription(topic, callbackUrl);
          const response = (data as { webhookSubscriptionCreate?: { userErrors?: unknown[] } }).webhookSubscriptionCreate;
          const errors = response?.userErrors || [];
          return { topic, ok: errors.length === 0, errors };
        } catch (error) {
          return { topic, ok: false, errors: [{ message: (error as { message?: string })?.message || "error" }] };
        }
      })
    );
    return NextResponse.json(
      {
        ok: results.every((item) => item.ok),
        callbackUrl,
        items: results,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "error" }, { status: 400 });
  }
});
