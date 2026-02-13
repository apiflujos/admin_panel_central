import type { Request, Response } from "express";
import { createSyncLog } from "../services/logs.service";
import { shopifyStoreExists } from "../services/store-connections.service";
import { verifyAlegraSignature, verifyShopifyHmac } from "../utils/webhook";
import { enqueueWebhookEvent } from "../services/sync.service";

export async function handleShopifyWebhook(req: Request, res: Response) {
  const signature = req.header("X-Shopify-Hmac-Sha256");
  const topic = req.header("X-Shopify-Topic") || "unknown";
  const shopDomain = req.header("X-Shopify-Shop-Domain") || "";
  const webhookId = req.header("X-Shopify-Webhook-Id") || "";

  // Ignore webhooks from stores that are not connected (prevents log noise after removing a shop).
  if (shopDomain && !(await shopifyStoreExists(shopDomain))) {
    return res.status(410).json({ status: "gone" });
  }

  if (!verifyShopifyHmac(req.rawBody as Buffer, signature || "")) {
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
    return res.status(401).json({ error: "invalid_signature" });
  }

  const payload =
    req.body && typeof req.body === "object"
      ? { ...(req.body as Record<string, unknown>), __shopDomain: shopDomain }
      : req.body;

  await enqueueWebhookEvent({
    source: "shopify",
    eventType: topic,
    payload,
    meta: { shopDomain, webhookId },
  });

  return res.status(200).json({ status: "accepted" });
}

export async function handleAlegraWebhook(req: Request, res: Response) {
  const signature = req.header("X-Alegra-Signature");
  const shopDomain =
    typeof req.query.shopDomain === "string" ? String(req.query.shopDomain).trim() : "";
  const rawBody = req.body || {};
  const eventType =
    rawBody?.event ||
    rawBody?.subject ||
    req.header("X-Alegra-Event") ||
    "unknown";

  if (shopDomain && !(await shopifyStoreExists(shopDomain))) {
    return res.status(410).json({ status: "gone" });
  }

  if (!verifyAlegraSignature(req.rawBody as Buffer, signature || "")) {
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
    return res.status(401).json({ error: "invalid_signature" });
  }
  const normalizedPayload =
    rawBody?.data ||
    rawBody?.message?.data ||
    rawBody?.message?.item
      ? {
          data: rawBody?.data || rawBody?.message?.data || rawBody?.message?.item,
          __shopDomain: shopDomain || undefined,
        }
      : rawBody;
  const normalizedEventType = normalizeAlegraEvent(eventType);
  setImmediate(() => {
    enqueueWebhookEvent({
      source: "alegra",
      eventType: normalizedEventType,
      payload: shopDomain
        ? { ...(normalizedPayload as Record<string, unknown>), __shopDomain: shopDomain }
        : normalizedPayload,
      meta: { eventType },
    }).catch(() => null);
  });

  return res.status(202).json({ status: "accepted" });
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

async function safeCreateWebhookLog(payload: Parameters<typeof createSyncLog>[0]) {
  try {
    await createSyncLog(payload);
  } catch {
    // ignore log failures
  }
}
