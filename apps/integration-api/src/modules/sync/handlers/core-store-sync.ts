import type { Request, Response } from "express";

import { syncProductsAcrossProviders } from "../../../../../../src/services/store-products-cross.service";
import { syncShopifyProductsBetweenStores } from "../../../../../../src/services/store-products-sync.service";

function parseBooleanLike(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  const lowered = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!lowered) return fallback;
  if (lowered === "1" || lowered === "true" || lowered === "yes" || lowered === "on") return true;
  if (lowered === "0" || lowered === "false" || lowered === "no" || lowered === "off") return false;
  return fallback;
}

export async function syncStoreProductsHandler(req: Request, res: Response) {
  const payload = req.body || {};
  const sourceProviderInput = String(payload.sourceProvider || payload.source || "")
    .trim()
    .toLowerCase();
  const targetProviderInput = String(payload.targetProvider || payload.target || "")
    .trim()
    .toLowerCase();
  const provider = String(
    payload.provider || (sourceProviderInput && targetProviderInput ? "cross" : "shopify")
  )
    .trim()
    .toLowerCase();
  const settings = typeof payload.settings === "object" && payload.settings ? payload.settings : {};
  const stream = req.query.stream === "1" || req.query.stream === "true" || parseBooleanLike(req.body?.stream, false);
  let streamOpen = stream;
  const sendStream = (data: Record<string, unknown>) => {
    if (!streamOpen || res.writableEnded || res.destroyed) return;
    try {
      res.write(`${JSON.stringify(data)}\n`);
    } catch {
      streamOpen = false;
    }
  };

  if (stream) {
    res.status(200);
    res.setHeader("Content-Type", "application/x-ndjson");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
    res.on("close", () => {
      streamOpen = false;
    });
  }

  try {
    if (provider === "shopify") {
      const result = await syncShopifyProductsBetweenStores({
        sourceShopDomain: String(payload.sourceShopDomain || "").trim(),
        targetShopDomain: String(payload.targetShopDomain || "").trim(),
        settings,
        onProgress: stream ? (data) => sendStream({ type: "progress", ...data }) : undefined,
        onStart: stream ? (data) => sendStream({ type: "start", ...data }) : undefined,
      });
      if (stream) {
        sendStream({ type: "complete", ...result });
        res.end();
      } else {
        res.json(result);
      }
      return;
    }

    const sourceProvider = sourceProviderInput;
    const targetProvider = targetProviderInput;

    if (!sourceProvider || !targetProvider) {
      res.status(400).json({ error: "sourceProvider y targetProvider requeridos." });
      return;
    }
    if (sourceProvider !== "shopify" && sourceProvider !== "woocommerce") {
      res.status(400).json({ error: "sourceProvider no soportado." });
      return;
    }
    if (targetProvider !== "shopify" && targetProvider !== "woocommerce") {
      res.status(400).json({ error: "targetProvider no soportado." });
      return;
    }

    const result = await syncProductsAcrossProviders({
      sourceProvider: sourceProvider as "shopify" | "woocommerce",
      targetProvider: targetProvider as "shopify" | "woocommerce",
      sourceShopDomain: String(payload.sourceShopDomain || "").trim(),
      targetShopDomain: String(payload.targetShopDomain || "").trim(),
      settings,
      onProgress: stream ? (data) => sendStream({ type: "progress", ...data }) : undefined,
      onStart: stream ? (data) => sendStream({ type: "start", ...data }) : undefined,
    });

    if (stream) {
      sendStream({ type: "complete", ...result });
      res.end();
    } else {
      res.json(result);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo sincronizar tiendas.";
    if (stream) {
      sendStream({ type: "error", error: message });
      res.end();
      return;
    }
    res.status(500).json({ error: message });
  }
}
