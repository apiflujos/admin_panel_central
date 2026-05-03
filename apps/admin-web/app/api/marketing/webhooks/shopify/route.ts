import { NextResponse } from "next/server";

import { ingestShopifyMarketingWebhook } from "../../../../../../../src/marketing/webhooks/shopify-marketing-webhooks.service";
import { shopifyStoreExists } from "../../../../../../../src/services/store-connections.service";
import { verifyShopifyHmac } from "../../../../../../../src/utils/webhook";
import { routeHandler } from "../../../../../lib/route-handler";

function parseWebhookBody(rawBody: Buffer) {
  if (!rawBody.length) return {};
  try {
    return JSON.parse(rawBody.toString("utf8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export const POST = routeHandler(async (req: Request) => {
  const rawBody = Buffer.from(await req.arrayBuffer());
  const signature = req.headers.get("x-shopify-hmac-sha256") ?? "";
  const ok = verifyShopifyHmac(rawBody, signature);
  if (!ok) {
    return NextResponse.json({ error: "invalid_hmac" }, { status: 401 });
  }

  const topic = req.headers.get("x-shopify-topic") ?? "";
  const shopDomain = req.headers.get("x-shopify-shop-domain") ?? "";
  const webhookId =
    req.headers.get("x-shopify-webhook-id") ||
    req.headers.get("x-shopify-delivery-id") ||
    req.headers.get("x-request-id") ||
    "";

  if (shopDomain && !(await shopifyStoreExists(shopDomain))) {
    return NextResponse.json({ status: "gone" }, { status: 410 });
  }

  try {
    const result = await ingestShopifyMarketingWebhook(
      { topic, shopDomain, webhookId: webhookId || `${Date.now()}` },
      rawBody,
      parseWebhookBody(rawBody)
    );
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "webhook_error" }, { status: 400 });
  }
});
