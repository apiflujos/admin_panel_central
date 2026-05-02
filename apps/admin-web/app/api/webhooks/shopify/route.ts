import { NextResponse } from "next/server";

import { createSyncLog } from "../../../../../../src/services/logs.service";
import { processRetryQueue } from "../../../../../../src/services/retry-queue.service";
import { shopifyStoreExists } from "../../../../../../src/services/store-connections.service";
import { enqueueWebhookEvent } from "../../../../../../src/services/sync.service";
import { verifyShopifyHmac } from "../../../../../../src/utils/webhook";
import { routeHandler } from "../../../../lib/route-handler";

async function safeCreateWebhookLog(payload: Parameters<typeof createSyncLog>[0]) {
  try {
    await createSyncLog(payload);
  } catch {
    // ignore log failures
  }
}

function parseWebhookBody(rawBody: Buffer) {
  if (!rawBody.length) return null;
  try {
    return JSON.parse(rawBody.toString("utf8")) as unknown;
  } catch {
    return null;
  }
}

export const POST = routeHandler(async (req: Request) => {
  const signature = req.headers.get("x-shopify-hmac-sha256") ?? "";
  const topic = req.headers.get("x-shopify-topic") ?? "unknown";
  const shopDomain = req.headers.get("x-shopify-shop-domain") ?? "";
  const webhookId = req.headers.get("x-shopify-webhook-id") ?? "";
  const rawBody = Buffer.from(await req.arrayBuffer());

  if (shopDomain && !(await shopifyStoreExists(shopDomain))) {
    return NextResponse.json({ status: "gone" }, { status: 410 });
  }

  if (!verifyShopifyHmac(rawBody, signature)) {
    await safeCreateWebhookLog({
      entity: "webhook",
      direction: "shopify->alegra",
      status: "fail",
      message: "Invalid Shopify signature",
      request: {
        eventType: topic,
        shopDomain,
        webhookId,
      },
    });
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const body = parseWebhookBody(rawBody);
  const payload =
    body && typeof body === "object"
      ? { ...(body as Record<string, unknown>), __shopDomain: shopDomain }
      : body;

  await enqueueWebhookEvent({
    source: "shopify",
    eventType: topic,
    payload,
    meta: { shopDomain, webhookId },
  });

  setImmediate(() => {
    processRetryQueue(1).catch((error) => console.error("Webhook retry trigger failed:", error));
  });

  return NextResponse.json({ status: "accepted" }, { status: 200 });
});
