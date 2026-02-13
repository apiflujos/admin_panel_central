import { Request, Response } from "express";
import { syncShopifyProductsBetweenStores } from "../services/store-products-sync.service";
import { syncProductsAcrossProviders } from "../services/store-products-cross.service";

export async function syncStoreProductsHandler(req: Request, res: Response) {
  const payload = req.body || {};
  const provider = String(payload.provider || "shopify").trim().toLowerCase();
  const settings = typeof payload.settings === "object" && payload.settings ? payload.settings : {};

  if (provider === "shopify") {
    const result = await syncShopifyProductsBetweenStores({
      sourceShopDomain: String(payload.sourceShopDomain || "").trim(),
      targetShopDomain: String(payload.targetShopDomain || "").trim(),
      settings,
    });
    res.json(result);
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
  });

  res.json(result);
}
