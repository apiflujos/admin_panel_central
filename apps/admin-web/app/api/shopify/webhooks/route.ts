import { NextResponse } from "next/server";

import { ShopifyClient } from "../../../../../../src/connectors/shopify";
import { getShopifyConnectionByDomain } from "../../../../../../src/services/store-connections.service";
import { routeHandler } from "../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../lib/route-auth";

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

async function registerShopifyWebhooks(client: ShopifyClient, baseUrl: string) {
  const callbackUrl = `${baseUrl.replace(/\/$/, "")}/api/webhooks/shopify`;
  const results = await Promise.all(
    DEFAULT_TOPICS.map(async (topic) => {
      try {
        const data = await client.createWebhookSubscription(topic, callbackUrl);
        const response = data.webhookSubscriptionCreate;
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
  };
}

export const POST = routeHandler(async (req: Request) => {
  await requireRouteAdmin();
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const shopDomain = String(body.shopDomain || "").trim();
    const connection = await getShopifyConnectionByDomain(shopDomain);
    const baseUrl = resolveBaseUrl(req);
    const client = new ShopifyClient({
      shopDomain: connection.shopDomain,
      accessToken: connection.accessToken,
    });
    const result = await registerShopifyWebhooks(client, baseUrl);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as { message?: string })?.message || "error" }, { status: 400 });
  }
});
