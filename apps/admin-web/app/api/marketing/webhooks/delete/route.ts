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

function normalizeUrl(value: string) {
  return value.replace(/\/$/, "").toLowerCase();
}

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
    const expectedCallback = normalizeUrl(`${baseUrl}/api/marketing/webhooks/shopify`);
    const client = new ShopifyClient({
      shopDomain: connection.shopDomain,
      accessToken: connection.accessToken,
    });
    const data = await client.listWebhookSubscriptions(50);
    const edges = (data as { webhookSubscriptions?: { edges?: Array<{ node?: { id?: string; topic?: string; endpoint?: { callbackUrl?: string } } }> } }).webhookSubscriptions?.edges || [];
    const toDelete = edges.filter((edge) => {
      const node = edge.node;
      const endpointUrl = node?.endpoint?.callbackUrl || "";
      return endpointUrl && normalizeUrl(endpointUrl) === expectedCallback;
    });
    const results = await Promise.all(
      toDelete.map(async (edge) => {
        try {
          const id = edge.node?.id;
          const topic = edge.node?.topic;
          const response = await client.deleteWebhookSubscription(id || "");
          const errors = response.webhookSubscriptionDelete?.userErrors || [];
          return { id, topic, ok: errors.length === 0, errors };
        } catch (error) {
          return {
            id: edge.node?.id,
            topic: edge.node?.topic,
            ok: false,
            errors: [{ message: (error as { message?: string })?.message || "error" }],
          };
        }
      })
    );
    const deleted = results.filter((item) => item.ok).length;
    return NextResponse.json(
      {
        ok: deleted === results.length,
        deleted,
        items: results,
        callbackUrl: `${baseUrl}/api/marketing/webhooks/shopify`,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "error" }, { status: 400 });
  }
});
