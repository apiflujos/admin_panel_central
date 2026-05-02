import { Router } from "express";

import { requireAdmin, requireSuperAdmin } from "../auth/guards";
import { getInventoryAdjustmentsCheckpoint } from "./handlers/core-checkpoints";
import { syncInvoicesToShopifyHandler } from "./handlers/core-invoices-sync";
import { listLogs, retryFailed } from "./handlers/core-logs";
import { backfillOrdersHandler, listOrdersHandler, syncOrdersHandler } from "./handlers/core-orders";
import {
  listAlegraItemsHandler,
  listInventoryAdjustmentsHandler,
  listItemWarehouseSummaryHandler,
  listProductsHandler,
  proxyAlegraImageHandler,
  syncInventoryAdjustmentsHandler,
} from "./handlers/core-products-queries";
import {
  lookupShopifyHandler,
  updateProductOversellHandler,
  updateProductTrackingHandler,
} from "./handlers/core-products-mutations";
import { backfillProductsHandler } from "./handlers/core-products-backfill";
import { syncProductImagesHandler } from "./handlers/core-product-images";
import { publishShopifyHandler } from "./handlers/core-products-publish";
import { syncProductsHandler } from "./handlers/core-products-sync";
import {
  stopProductImagesSyncHandler,
  stopProductsShopifyToAlegraSyncHandler,
  stopProductsSyncHandler,
  syncProductsShopifyToAlegraHandler,
} from "./handlers/core-products-sync-control";
import { syncStoreProductsHandler } from "./handlers/core-store-sync";
import { getAdminWebOrdersHandler } from "./handlers/admin-web-orders";
import { getAdminWebProductsHandler } from "./handlers/admin-web-products";
import { wrap } from "../../router-utils";

export function createSyncRouter() {
  const router = Router();

  router.get("/logs", requireSuperAdmin, wrap(listLogs));
  router.post("/logs/retry", requireSuperAdmin, wrap(retryFailed));
  router.get("/admin-web/orders", requireAdmin, wrap(getAdminWebOrdersHandler));
  router.get("/admin-web/products", requireAdmin, wrap(getAdminWebProductsHandler));
  router.get("/alegra/items", wrap(listAlegraItemsHandler));
  router.get("/products", wrap(listProductsHandler));
  router.get("/alegra/items/:itemId/warehouses", wrap(listItemWarehouseSummaryHandler));
  router.get("/alegra/inventory-adjustments", wrap(listInventoryAdjustmentsHandler));
  router.get("/alegra/image", wrap(proxyAlegraImageHandler));
  router.get("/checkpoints/inventory-adjustments", wrap(getInventoryAdjustmentsCheckpoint));
  router.post("/shopify/publish", wrap(publishShopifyHandler));
  router.post("/shopify/lookup-batch", wrap(lookupShopifyHandler));
  router.post("/products/oversell", requireAdmin, wrap(updateProductOversellHandler));
  router.post("/products/tracking", requireAdmin, wrap(updateProductTrackingHandler));
  router.post("/sync/products", wrap(syncProductsHandler));
  router.post("/sync/products/stop", wrap(stopProductsSyncHandler));
  router.post("/sync/products/shopify-to-alegra", wrap(syncProductsShopifyToAlegraHandler));
  router.post("/sync/products/shopify-to-alegra/stop", wrap(stopProductsShopifyToAlegraSyncHandler));
  router.post("/sync/product-images", wrap(syncProductImagesHandler));
  router.post("/sync/product-images/stop", wrap(stopProductImagesSyncHandler));
  router.post("/sync/orders", wrap(syncOrdersHandler));
  router.post("/sync/invoices", wrap(syncInvoicesToShopifyHandler));
  router.post("/backfill/products", wrap(backfillProductsHandler));
  router.post("/backfill/orders", wrap(backfillOrdersHandler));
  router.post("/sync/inventory-adjustments", wrap(syncInventoryAdjustmentsHandler));
  router.post("/sync/stores/products", requireAdmin, wrap(syncStoreProductsHandler));
  router.get("/orders", wrap(listOrdersHandler));

  return router;
}
