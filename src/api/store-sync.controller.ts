import { Request, Response } from "express";
import { syncShopifyProductsBetweenStores } from "../services/store-products-sync.service";

export async function syncStoreProductsHandler(req: Request, res: Response) {
  const { provider = "shopify", sourceShopDomain, targetShopDomain, settings = {} } = req.body || {};
  if (provider !== "shopify") {
    res.status(400).json({ error: "Proveedor no soportado." });
    return;
  }

  const result = await syncShopifyProductsBetweenStores({
    sourceShopDomain: String(sourceShopDomain || "").trim(),
    targetShopDomain: String(targetShopDomain || "").trim(),
    settings: typeof settings === "object" && settings ? settings : {},
  });

  res.json(result);
}
