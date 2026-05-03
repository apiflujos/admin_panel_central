import { NextResponse } from "next/server";

import { ShopifyClient } from "../../../../../../../src/connectors/shopify";
import { getShopifyConnectionByDomain } from "../../../../../../../src/services/store-connections.service";
import { routeHandler } from "../../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../../lib/route-auth";

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
    const data = await client.listWebhookSubscriptions(100);
    const edges = data.webhookSubscriptions?.edges || [];
    const expectedCallback = normalizeUrl(`${baseUrl}/api/webhooks/shopify`);
    const targets = edges.filter((edge) => {
      const endpointUrl = edge.node.endpoint?.callbackUrl || "";
      return endpointUrl && normalizeUrl(endpointUrl) === expectedCallback;
    });
    const results = await Promise.all(
      targets.map(async (edge) => {
        try {
          const response = await client.deleteWebhookSubscription(edge.node.id);
          const payload = response.webhookSubscriptionDelete;
          return {
            id: edge.node.id,
            ok: payload.userErrors.length === 0,
            errors: payload.userErrors || [],
          };
        } catch (error) {
          return {
            id: edge.node.id,
            ok: false,
            errors: [{ message: (error as { message?: string })?.message || "error" }],
          };
        }
      })
    );
    const deleted = results.filter((item) => item.ok).length;
    return NextResponse.json(
      {
        ok: deleted === targets.length,
        deleted,
        total: targets.length,
        items: results,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: (error as { message?: string })?.message || "error" }, { status: 400 });
  }
});
