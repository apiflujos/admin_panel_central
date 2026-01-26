import { Router } from "express";
import { handleAlegraWebhook, handleShopifyWebhook } from "./webhooks.controller";
import { authMe, changePasswordHandler, loginHandler, logoutHandler } from "./auth.controller";
import { assistantExecuteHandler, assistantQueryHandler } from "./assistant.controller";
import { listLogs, retryFailed } from "./logs.controller";
import { listAlegraCatalog, getSettings, listResolutions, testConnections, updateSettings } from "./settings.controller";
import { listMetrics } from "./metrics.controller";
import { getInventoryAdjustmentsCheckpoint } from "./checkpoints.controller";
import {
  listOperationsHandler,
  syncOperationHandler,
  retryInvoiceHandler,
  seedOperationsHandler,
  getEinvoiceOverrideHandler,
  saveEinvoiceOverrideHandler,
} from "./operations.controller";
import { emitPaymentHandler, voidInvoiceHandler } from "./operations-actions.controller";
import {
  listAlegraItemsHandler,
  listInventoryAdjustmentsHandler,
  listItemWarehouseSummaryHandler,
  proxyAlegraImageHandler,
  lookupShopifyHandler,
  publishShopifyHandler,
  syncInventoryAdjustmentsHandler,
  stopProductsSyncHandler,
  syncOrdersHandler,
  syncProductsHandler,
} from "./products.controller";

export const router = Router();

router.post("/webhooks/shopify", handleShopifyWebhook);
router.post("/webhooks/alegra", handleAlegraWebhook);

router.post("/auth/login", loginHandler);
router.post("/auth/logout", logoutHandler);
router.post("/auth/password", changePasswordHandler);
router.get("/auth/me", authMe);

router.get("/logs", listLogs);
router.post("/logs/retry", retryFailed);

router.get("/alegra/items", listAlegraItemsHandler);
router.get("/alegra/items/:itemId/warehouses", listItemWarehouseSummaryHandler);
router.get("/alegra/inventory-adjustments", listInventoryAdjustmentsHandler);
router.get("/alegra/image", proxyAlegraImageHandler);
router.post("/settings/test", testConnections);
router.put("/settings", updateSettings);
router.get("/settings", getSettings);
router.get("/settings/resolutions", listResolutions);
router.get("/alegra/:catalog", listAlegraCatalog);
router.get("/metrics", listMetrics);
router.get("/checkpoints/inventory-adjustments", getInventoryAdjustmentsCheckpoint);
router.post("/assistant/query", assistantQueryHandler);
router.post("/assistant/execute", assistantExecuteHandler);
router.post("/shopify/publish", publishShopifyHandler);
router.post("/shopify/lookup-batch", lookupShopifyHandler);
router.post("/sync/products", syncProductsHandler);
router.post("/sync/products/stop", stopProductsSyncHandler);
router.post("/sync/orders", syncOrdersHandler);
router.post("/sync/inventory-adjustments", syncInventoryAdjustmentsHandler);
router.get("/operations", listOperationsHandler);
router.post("/operations/seed", seedOperationsHandler);
router.post("/operations/:orderId/sync", syncOperationHandler);
router.post("/operations/:orderId/invoice", retryInvoiceHandler);
router.get("/operations/:orderId/einvoice", getEinvoiceOverrideHandler);
router.put("/operations/:orderId/einvoice", saveEinvoiceOverrideHandler);
router.post("/operations/:orderId/payment", emitPaymentHandler);
router.post("/operations/:orderId/cancel", voidInvoiceHandler);
