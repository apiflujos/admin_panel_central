import type { Request, Response } from "express";
import { runWithOrg } from "../db";
import { createSyncLog } from "../services/logs.service";
import {
  resolveOrgIdByAlegraAccountId,
  resolveOrgIdByShopDomain,
} from "../services/organizations.service";
import { shopifyStoreExists } from "../services/store-connections.service";
import { recordWebhookReceipt } from "../services/webhook-receipts.service";
import { verifyAlegraSignature, verifyShopifyHmac } from "../utils/webhook";
import { verifyShopifyWebhookHmacForShop } from "../services/shopify-app-credentials.service";
import { enqueueWebhookEvent } from "../services/sync.service";

/**
 * Con express.raw, req.body llega como Buffer. Este helper lo parsea a JSON
 * (o devuelve un objeto vacío si el body está vacío / no es JSON válido).
 */
function parseRawBody(req: Request): Record<string, unknown> {
  const raw = req.body;
  if (Buffer.isBuffer(raw)) {
    if (!raw.length) return {};
    try {
      const parsed = JSON.parse(raw.toString("utf8"));
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  if (raw && typeof raw === "object") return raw as Record<string, unknown>;
  return {};
}

function getRawBuffer(req: Request): Buffer {
  const raw = req.body;
  if (Buffer.isBuffer(raw)) return raw;
  const stored = (req as Request & { rawBody?: Buffer }).rawBody;
  if (Buffer.isBuffer(stored)) return stored;
  return Buffer.from("");
}

export async function handleShopifyWebhook(req: Request, res: Response) {
  const signature = req.header("X-Shopify-Hmac-Sha256");
  const topic = req.header("X-Shopify-Topic") || "unknown";
  const shopDomain = req.header("X-Shopify-Shop-Domain") || "";
  const webhookId = req.header("X-Shopify-Webhook-Id") || "";

  // HMAC PRIMERO sobre el body crudo. Fast path: secret env/global (sin DB) —
  // mantiene la protección "sin queries antes de validar" para el caso común.
  // Fallback per-tienda: si falla y hay shop domain, resolvemos el secret propio
  // de la app de esa tienda (store→global→env) y reintentamos.
  const rawBuffer = getRawBuffer(req);
  let hmacOk = verifyShopifyHmac(rawBuffer, signature || "");
  if (!hmacOk && shopDomain) {
    hmacOk = await verifyShopifyWebhookHmacForShop(rawBuffer, signature || "", shopDomain);
  }
  if (!hmacOk) {
    console.warn(`[webhook][shopify] invalid HMAC topic=${topic} shopDomain=${shopDomain}`);
    return res.status(401).json({ error: "invalid_signature" });
  }

  // Resolver orgId ANTES de otras queries; sin org no procesamos.
  const orgId = shopDomain ? await resolveOrgIdByShopDomain(shopDomain) : null;
  if (!orgId) {
    // No conocemos la tienda — 200 + log; NO 410 (Shopify desinstalaría el webhook).
    console.warn(`[webhook][shopify] unknown shop ${shopDomain} — dropping`);
    return res.status(200).json({ status: "ignored", reason: "unknown_shop" });
  }

  return runWithOrg(orgId, async () => {
    if (!(await shopifyStoreExists(shopDomain))) {
      return res.status(200).json({ status: "ignored", reason: "shop_removed" });
    }

    // Dedupe: si Shopify redeliverea el mismo webhookId, corto-circuito con 200.
    if (webhookId) {
      const isFresh = await recordWebhookReceipt({
        source: "shopify",
        webhookId,
        topic,
        shopDomain,
      }).catch(() => true);
      if (!isFresh) {
        return res.status(200).json({ status: "duplicate", webhookId });
      }
    }

    const parsedPayload = parseRawBody(req);
    const payload = { ...parsedPayload, __shopDomain: shopDomain };

    await enqueueWebhookEvent({
      source: "shopify",
      eventType: topic,
      payload,
      meta: { shopDomain, webhookId },
    });

    return res.status(200).json({ status: "accepted" });
  });
}

export async function handleAlegraWebhook(req: Request, res: Response) {
  const signature = req.header("X-Alegra-Signature");
  const rawBuffer = getRawBuffer(req);

  // HMAC PRIMERO — sin DB queries antes de validar.
  if (!verifyAlegraSignature(rawBuffer, signature || "")) {
    console.warn(`[webhook][alegra] invalid signature`);
    return res.status(401).json({ error: "invalid_signature" });
  }

  const rawBody = parseRawBody(req);
  const eventType =
    (typeof rawBody.event === "string" ? rawBody.event : undefined) ||
    (typeof rawBody.subject === "string" ? rawBody.subject : undefined) ||
    req.header("X-Alegra-Event") ||
    "unknown";
  const rawData = (rawBody as Record<string, unknown>).data as Record<string, unknown> | undefined;
  const rawMessage = (rawBody as Record<string, unknown>).message as Record<string, unknown> | undefined;

  // Prefer alegra accountId del payload; solo como fallback usar shopDomain de query.
  const accountIdRaw =
    (rawBody as Record<string, unknown>).accountId ||
    (rawData ? rawData.accountId : undefined) ||
    ((rawData as Record<string, unknown> | undefined)?.account as Record<string, unknown> | undefined)?.id ||
    (rawMessage ? rawMessage.accountId : undefined);
  const accountId = Number(accountIdRaw);
  let orgId: number | null = null;
  let shopDomain = "";

  if (Number.isFinite(accountId) && accountId > 0) {
    orgId = await resolveOrgIdByAlegraAccountId(accountId);
  }
  if (!orgId) {
    const shopDomainQuery = typeof req.query.shopDomain === "string" ? String(req.query.shopDomain).trim() : "";
    if (shopDomainQuery) {
      console.warn(
        `[webhook][alegra] falling back to shopDomain query param (${shopDomainQuery}) — payload should include accountId`
      );
      shopDomain = shopDomainQuery;
      orgId = await resolveOrgIdByShopDomain(shopDomainQuery);
    }
  }
  if (!orgId) {
    console.warn(`[webhook][alegra] cannot resolve org (event=${eventType})`);
    return res.status(200).json({ status: "ignored", reason: "unknown_org" });
  }

  return runWithOrg(orgId, async () => {
    // Dedupe Alegra: usar signature como webhookId (Alegra no manda header con id único).
    const alegraWebhookId = signature ? signature.slice(0, 128) : "";
    if (alegraWebhookId) {
      const isFresh = await recordWebhookReceipt({
        source: "alegra",
        webhookId: alegraWebhookId,
        topic: normalizeAlegraEvent(eventType),
        shopDomain,
      }).catch(() => true);
      if (!isFresh) {
        return res.status(200).json({ status: "duplicate" });
      }
    }

    const nestedData =
      rawData ||
      (rawMessage ? (rawMessage.data as Record<string, unknown> | undefined) : undefined) ||
      (rawMessage ? (rawMessage.item as Record<string, unknown> | undefined) : undefined);
    const normalizedPayload = nestedData
      ? { data: nestedData, __shopDomain: shopDomain || undefined }
      : rawBody;
    const normalizedEventType = normalizeAlegraEvent(eventType);
    // Enqueue SÍNCRONO — antes de responder — para no perder eventos si el proceso muere post-ACK.
    try {
      await enqueueWebhookEvent({
        source: "alegra",
        eventType: normalizedEventType,
        payload: shopDomain
          ? { ...(normalizedPayload as Record<string, unknown>), __shopDomain: shopDomain }
          : normalizedPayload,
        meta: { eventType, accountId: accountIdRaw || undefined },
      });
    } catch (error) {
      console.error("[webhook][alegra] enqueue failed:", error);
      return res.status(500).json({ error: "enqueue_failed" });
    }
    return res.status(202).json({ status: "accepted" });
  });
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
