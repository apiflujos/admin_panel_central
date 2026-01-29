import { Router } from "express";
import { handleAlegraWebhook, handleShopifyWebhook } from "./webhooks.controller";
import { authMe, authMiddleware, changePasswordHandler, loginHandler, logoutHandler, requireAdmin } from "./auth.controller";
import { assistantExecuteHandler, assistantQueryHandler } from "./assistant.controller";
import { listLogs, retryFailed } from "./logs.controller";
import { listAlegraCatalog, getSettings, listResolutions, testConnections, updateSettings } from "./settings.controller";
import { listMetrics } from "./metrics.controller";
import { getInventoryAdjustmentsCheckpoint } from "./checkpoints.controller";
import { createConnection, listConnections, removeConnection } from "./connections.controller";
import { listStoreConfigsHandler, saveStoreConfigHandler } from "./store-configs.controller";
import {
  createUserHandler,
  deleteUserHandler,
  getProfileHandler,
  listUsersHandler,
  updateProfileHandler,
  updateUserHandler,
} from "./users.controller";
import { getCompanyHandler, getCompanyPublicHandler, updateCompanyHandler } from "./company.controller";
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
router.get("/company/public", getCompanyPublicHandler);

router.use(authMiddleware);

router.post("/auth/logout", logoutHandler);
router.post("/auth/password", changePasswordHandler);
router.get("/auth/me", authMe);
router.get("/profile", getProfileHandler);
router.put("/profile", updateProfileHandler);
router.get("/company", getCompanyHandler);
router.put("/company", requireAdmin, updateCompanyHandler);
router.get("/users", requireAdmin, listUsersHandler);
router.post("/users", requireAdmin, createUserHandler);
router.put("/users/:userId", requireAdmin, updateUserHandler);
router.delete("/users/:userId", requireAdmin, deleteUserHandler);

router.get("/logs", listLogs);
router.post("/logs/retry", retryFailed);

router.get("/alegra/items", listAlegraItemsHandler);
router.get("/alegra/items/:itemId/warehouses", listItemWarehouseSummaryHandler);
router.get("/alegra/inventory-adjustments", listInventoryAdjustmentsHandler);
router.get("/alegra/image", proxyAlegraImageHandler);
router.get("/connections", requireAdmin, listConnections);
router.post("/connections", requireAdmin, createConnection);
router.delete("/connections/:id", requireAdmin, removeConnection);
router.get("/store-configs", requireAdmin, listStoreConfigsHandler);
router.put("/store-configs/:shopDomain", requireAdmin, saveStoreConfigHandler);
router.post("/settings/test", requireAdmin, testConnections);
router.put("/settings", requireAdmin, updateSettings);
router.get("/settings", requireAdmin, getSettings);
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
