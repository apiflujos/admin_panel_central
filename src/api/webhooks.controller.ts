import type { Request, Response } from "express";
import { verifyAlegraSignature, verifyShopifyHmac } from "../utils/webhook";
import { enqueueWebhookEvent } from "../services/sync.service";

export async function handleShopifyWebhook(req: Request, res: Response) {
  const signature = req.header("X-Shopify-Hmac-Sha256");
  const topic = req.header("X-Shopify-Topic") || "unknown";
  const shopDomain = req.header("X-Shopify-Shop-Domain") || "";

  if (!verifyShopifyHmac(req.rawBody as Buffer, signature || "")) {
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
  });

  return res.status(200).json({ status: "accepted" });
}

export async function handleAlegraWebhook(req: Request, res: Response) {
  const signature = req.header("X-Alegra-Signature");
  const rawBody = req.body || {};
  const eventType =
    rawBody?.event ||
    rawBody?.subject ||
    req.header("X-Alegra-Event") ||
    "unknown";

  if (signature && !verifyAlegraSignature(req.rawBody as Buffer, signature)) {
    return res.status(401).json({ error: "invalid_signature" });
  }
  const normalizedPayload =
    rawBody?.data ||
    rawBody?.message?.data ||
    rawBody?.message?.item
      ? { data: rawBody?.data || rawBody?.message?.data || rawBody?.message?.item }
      : rawBody;
  const normalizedEventType = normalizeAlegraEvent(eventType);
  setImmediate(() => {
    enqueueWebhookEvent({
      source: "alegra",
      eventType: normalizedEventType,
      payload: normalizedPayload,
    }).catch(() => null);
  });

  return res.status(202).json({ status: "accepted" });
}

function normalizeAlegraEvent(eventType: string) {
  const normalized = String(eventType || "").toLowerCase();
  if (normalized === "new-item") return "item.created";
  if (normalized === "update-item") return "item.updated";
  if (normalized === "inventory-update") return "inventory.updated";
  return eventType;
}
