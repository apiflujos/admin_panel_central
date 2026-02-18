import { Request, Response } from "express";
import { syncShopifyProductsBetweenStores } from "../services/store-products-sync.service";
import { syncProductsAcrossProviders } from "../services/store-products-cross.service";

export async function syncStoreProductsHandler(req: Request, res: Response) {
  const payload = req.body || {};
  const provider = String(payload.provider || "shopify").trim().toLowerCase();
  const settings = typeof payload.settings === "object" && payload.settings ? payload.settings : {};
  const stream =
    req.query.stream === "1" ||
    req.query.stream === "true" ||
    req.body?.stream === true;
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

    const sourceProvider = String(payload.sourceProvider || payload.source || "").trim().toLowerCase();
    const targetProvider = String(payload.targetProvider || payload.target || "").trim().toLowerCase();

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
