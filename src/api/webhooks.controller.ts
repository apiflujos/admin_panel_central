import type { Request, Response } from "express";
import { runWithOrg } from "../db";
import { resolveOrgIdByAlegraAccountId, resolveOrgIdByShopDomain } from "../services/organizations.service";
import { shopifyStoreExists } from "../services/store-connections.service";
import { recordWebhookReceipt } from "../services/webhook-receipts.service";
import { verifyAlegraSignature } from "../utils/webhook";
import { verifyShopifyWebhookHmacForShop } from "../services/shopify-app-credentials.service";
import { enqueueWebhookEvent } from "../services/sync.service";
import { registrarWebhookSinAsociar } from "../services/webhooks-sin-asociar.service";

/**
 * Con express.raw, req.body llega como Buffer. Este helper lo parsea a JSON
 * (o devuelve un objeto vacío si el body está vacío / no es JSON válido).
 */
/**
 * Antes devolvía `{}` tanto si el cuerpo venía vacío como si era ilegible, y el
 * evento se encolaba VACÍO: firma válida, contenido perdido y nadie enterado.
 * Ahora se distingue, para poder registrar el ilegible en vez de tragárselo.
 */
type CuerpoLeido = { ok: true; datos: Record<string, unknown> } | { ok: false; crudo: string };

function leerCuerpo(req: Request): CuerpoLeido {
  const raw = req.body;
  if (Buffer.isBuffer(raw)) {
    if (!raw.length) return { ok: true, datos: {} };
    const texto = raw.toString("utf8");
    try {
      const parsed = JSON.parse(texto);
      if (parsed && typeof parsed === "object") return { ok: true, datos: parsed as Record<string, unknown> };
      return { ok: false, crudo: texto };
    } catch {
      return { ok: false, crudo: texto };
    }
  }
  if (raw && typeof raw === "object") return { ok: true, datos: raw as Record<string, unknown> };
  return { ok: true, datos: {} };
}

/** Recorta el cuerpo ilegible: se guarda para reclamar, no para archivar. */
const recorte = (texto: string) => texto.slice(0, 4000);

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

  // La firma se valida con el secreto cifrado de la tienda (o el global) en BD.
  // No existe una segunda fuente en .env que pueda discrepar de la conexión.
  const rawBuffer = getRawBuffer(req);
  const hmacOk = shopDomain ? await verifyShopifyWebhookHmacForShop(rawBuffer, signature || "", shopDomain) : false;
  if (!hmacOk) {
    console.warn(`[webhook][shopify] invalid HMAC topic=${topic} shopDomain=${shopDomain}`);
    // Se deja constancia SIN el cuerpo. Importa el hecho y el volumen: si sube
    // de golpe, lo más probable es que el secreto se haya desincronizado y
    // estemos rechazando eventos legítimos.
    await registrarWebhookSinAsociar({
      source: "shopify",
      eventType: topic,
      shopDomain,
      motivo: "firma_invalida",
      detalle: signature ? "Firma presente pero no coincide." : "La petición no trae firma.",
    });
    return res.status(401).json({ error: "invalid_signature" });
  }

  // Resolver orgId ANTES de otras queries; sin org no procesamos.
  const orgId = shopDomain ? await resolveOrgIdByShopDomain(shopDomain) : null;
  if (!orgId) {
    // No conocemos la tienda — 200 + log; NO 410 (Shopify desinstalaría el webhook).
    console.warn(`[webhook][shopify] tienda desconocida ${shopDomain}`);
    // La firma ya se validó: el evento es legítimo y se estaba perdiendo.
    const cuerpo = leerCuerpo(req);
    await registrarWebhookSinAsociar({
      source: "shopify",
      eventType: topic,
      shopDomain,
      motivo: "tienda_desconocida",
      detalle: shopDomain ? null : "El evento no trae el dominio de la tienda.",
      payload: cuerpo.ok ? cuerpo.datos : { __cuerpoIlegible: recorte(cuerpo.crudo) },
    });
    return res.status(200).json({ status: "ignored", reason: "unknown_shop" });
  }

  return runWithOrg(orgId, async () => {
    if (!(await shopifyStoreExists(shopDomain))) {
      const cuerpo = leerCuerpo(req);
      await registrarWebhookSinAsociar({
        organizationId: orgId,
        source: "shopify",
        eventType: topic,
        shopDomain,
        motivo: "tienda_eliminada",
        payload: cuerpo.ok ? cuerpo.datos : { __cuerpoIlegible: recorte(cuerpo.crudo) },
      });
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

    const cuerpo = leerCuerpo(req);
    if (!cuerpo.ok) {
      // Firma válida pero contenido no procesable. Antes se encolaba `{}` y el
      // contenido desaparecía sin que nadie se enterara.
      await registrarWebhookSinAsociar({
        organizationId: orgId,
        source: "shopify",
        eventType: topic,
        shopDomain,
        motivo: "cuerpo_ilegible",
        detalle: "La firma es válida, así que el evento es legítimo, pero el cuerpo no es JSON.",
        payload: { __cuerpoIlegible: recorte(cuerpo.crudo) },
      });
      return res.status(200).json({ status: "ignored", reason: "unreadable_body" });
    }
    const payload = { ...cuerpo.datos, __shopDomain: shopDomain };

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
    console.warn(`[webhook][alegra] firma inválida`);
    await registrarWebhookSinAsociar({
      source: "alegra",
      eventType: req.header("X-Alegra-Event") || "",
      motivo: "firma_invalida",
      detalle: signature ? "Firma presente pero no coincide." : "La petición no trae firma.",
    });
    return res.status(401).json({ error: "invalid_signature" });
  }

  const cuerpoAlegra = leerCuerpo(req);
  if (!cuerpoAlegra.ok) {
    await registrarWebhookSinAsociar({
      source: "alegra",
      eventType: req.header("X-Alegra-Event") || "",
      motivo: "cuerpo_ilegible",
      detalle: "La firma es válida, así que el evento es legítimo, pero el cuerpo no es JSON.",
      payload: { __cuerpoIlegible: recorte(cuerpoAlegra.crudo) },
    });
    return res.status(200).json({ status: "ignored", reason: "unreadable_body" });
  }
  const rawBody = cuerpoAlegra.datos;
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
    console.warn(`[webhook][alegra] no se puede resolver la organización (evento=${eventType})`);
    // Este es el caso que dejaba a ciegas: sin registro no había manera de
    // distinguir «Alegra no nos manda nada» de «nos manda y lo tiramos».
    await registrarWebhookSinAsociar({
      source: "alegra",
      eventType: normalizeAlegraEvent(eventType),
      accountId: accountIdRaw ? String(accountIdRaw) : "",
      motivo: "cuenta_desconocida",
      detalle: accountIdRaw
        ? `El evento trae la cuenta ${String(accountIdRaw)} pero no está asociada a ninguna tienda.`
        : "El evento no trae accountId y la URL no lleva ?shopDomain=.",
      payload: rawBody,
    });
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
    const normalizedPayload = nestedData ? { data: nestedData, __shopDomain: shopDomain || undefined } : rawBody;
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
