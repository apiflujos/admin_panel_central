import { NextResponse } from "next/server";

import { createSyncLog } from "../../../../../../src/services/logs.service";
import { processRetryQueue } from "../../../../../../src/services/retry-queue.service";
import { shopifyStoreExists } from "../../../../../../src/services/store-connections.service";
import { enqueueWebhookEvent } from "../../../../../../src/services/sync.service";
import { recordWebhookReceipt } from "../../../../../../src/services/webhook-receipts.service";
import { verifyAlegraSignature } from "../../../../../../src/utils/webhook";
import { routeHandler } from "../../../../lib/route-handler";

async function safeCreateWebhookLog(payload: Parameters<typeof createSyncLog>[0]) {
  try {
    await createSyncLog(payload);
  } catch {
    // ignore log failures
  }
}

function normalizeAlegraEvent(eventType: string) {
  const normalized = String(eventType || "").toLowerCase();
  if (normalized === "new-item") return "item.created";
  if (normalized === "update-item") return "item.updated";
  if (normalized === "inventory-update") return "inventory.updated";
  if (normalized === "new-invoice" || normalized === "invoice-create" || normalized === "invoice-created") {
    return "invoice.created";
  }
  if (normalized === "update-invoice" || normalized === "invoice-update" || normalized === "invoice-updated") {
    return "invoice.updated";
  }
  if (normalized.includes("invoice") && normalized.includes("new")) return "invoice.created";
  if (normalized.includes("invoice") && normalized.includes("update")) return "invoice.updated";
  return eventType;
}

function parseWebhookBody(rawBody: Buffer) {
  if (!rawBody.length) return {};
  try {
    return JSON.parse(rawBody.toString("utf8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export const POST = routeHandler(async (req: Request) => {
  const signature = req.headers.get("x-alegra-signature") ?? "";
  const url = new URL(req.url);
  const shopDomain = typeof url.searchParams.get("shopDomain") === "string" ? String(url.searchParams.get("shopDomain") || "").trim() : "";
  const rawBody = Buffer.from(await req.arrayBuffer());
  const body = parseWebhookBody(rawBody);
  const eventType = String(
    body?.event ||
      body?.subject ||
      req.headers.get("x-alegra-event") ||
      "unknown"
  );

  if (shopDomain && !(await shopifyStoreExists(shopDomain))) {
    return NextResponse.json({ status: "gone" }, { status: 410 });
  }

  if (!verifyAlegraSignature(rawBody, signature)) {
    await safeCreateWebhookLog({
      entity: "webhook",
      direction: "alegra->shopify",
      status: "fail",
      message: "Invalid Alegra signature",
      request: {
        eventType,
        shopDomain,
      },
    });
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const webhookId = String(
    req.headers.get("x-alegra-webhook-id") ||
      req.headers.get("x-alegra-delivery-id") ||
      body?.id ||
      ""
  ).trim();
  if (webhookId) {
    const fresh = await recordWebhookReceipt({
      source: "alegra",
      webhookId,
      topic: eventType,
      shopDomain,
    });
    if (!fresh) {
      return NextResponse.json({ status: "duplicate" }, { status: 200 });
    }
  }

  const raw = body || {};
  const normalizedPayload =
    raw?.data || (raw as { message?: { data?: unknown; item?: unknown } }).message?.data || (raw as { message?: { data?: unknown; item?: unknown } }).message?.item
      ? {
          data:
            raw?.data ||
            (raw as { message?: { data?: unknown; item?: unknown } }).message?.data ||
            (raw as { message?: { data?: unknown; item?: unknown } }).message?.item,
          __shopDomain: shopDomain || undefined,
        }
      : raw;
  const normalizedEventType = normalizeAlegraEvent(eventType);

  await enqueueWebhookEvent({
    source: "alegra",
    eventType: normalizedEventType,
    payload: shopDomain
      ? { ...(normalizedPayload as Record<string, unknown>), __shopDomain: shopDomain }
      : normalizedPayload,
    meta: { eventType },
  });

  setImmediate(() => {
    processRetryQueue(1).catch((error) => console.error("Webhook retry trigger failed:", error));
  });

  return NextResponse.json({ status: "accepted" }, { status: 202 });
});
