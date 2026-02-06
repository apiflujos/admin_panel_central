import { Router } from "express";
import { handleAlegraWebhook, handleShopifyWebhook } from "./webhooks.controller";
import { authMe, authMiddleware, changePasswordHandler, createAuthTokenHandler, loginHandler, logoutHandler, requireAdmin } from "./auth.controller";
import { assistantExecuteHandler, assistantQueryHandler } from "./assistant.controller";
import { listLogs, retryFailed } from "./logs.controller";
import { listAlegraCatalog, getSettings, listResolutions, testConnections, updateSettings } from "./settings.controller";
import { listMetrics } from "./metrics.controller";
import { downloadCommerceReportCsvHandler } from "./reports.controller";
import {
  marketingDashboardHandler,
  marketingInsightsHandler,
  marketingRecomputeMetricsHandler,
  marketingSyncOrdersHandler,
  marketingUpsertCampaignSpendHandler,
} from "./marketing.controller";
import { shopifyMarketingWebhookHandler } from "./marketing-webhooks.controller";
import { marketingCollectHandler, marketingPixelScriptHandler } from "./marketing-pixel.controller";
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
  listProductsHandler,
  listInventoryAdjustmentsHandler,
  listItemWarehouseSummaryHandler,
  proxyAlegraImageHandler,
  lookupShopifyHandler,
  publishShopifyHandler,
  syncInventoryAdjustmentsHandler,
  stopProductsSyncHandler,
  syncProductsShopifyToAlegraHandler,
  stopProductsShopifyToAlegraSyncHandler,
  syncProductImagesHandler,
  stopProductImagesSyncHandler,
  syncOrdersHandler,
  syncProductsHandler,
  backfillProductsHandler,
} from "./products.controller";
import {
  createShopifyWebhooksHandler,
  deleteShopifyWebhooksHandler,
  getShopifyWebhooksStatusHandler,
} from "./shopify-webhooks.controller";
import { shopifyOAuthCallback, shopifyOAuthStatus, startShopifyOAuth } from "./shopify-oauth.controller";
import { listContactsHandler, syncContactHandler, syncContactsBulkHandler } from "./contacts.controller";
import { listOrdersHandler, backfillOrdersHandler } from "./orders.controller";
import { downloadInvoicePdfHandler, listInvoicesHandler } from "./invoices.controller";
import { syncInvoicesToShopifyHandler } from "./invoices-sync.controller";
import { marketingGraphqlHttpHandler } from "../marketing/graphql/marketing-graphql";

export const router = Router();

const wrap =
  (handler: (...args: any[]) => any) =>
  (req: any, res: any, next: any) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };

router.post("/webhooks/shopify", wrap(handleShopifyWebhook));
router.post("/webhooks/alegra", wrap(handleAlegraWebhook));

// Marketing (public, key-gated or HMAC-verified)
router.post("/marketing/webhooks/shopify", wrap(shopifyMarketingWebhookHandler));
router.get("/marketing/pixel.js", wrap(marketingPixelScriptHandler));
router.post("/marketing/collect", wrap(marketingCollectHandler));

router.post("/auth/login", wrap(loginHandler));
router.get("/auth/shopify", wrap(startShopifyOAuth));
router.get("/auth/shopify/callback", wrap(shopifyOAuthCallback));
router.get("/company/public", wrap(getCompanyPublicHandler));

router.use(wrap(authMiddleware));

router.post("/auth/logout", wrap(logoutHandler));
router.post("/auth/password", wrap(changePasswordHandler));
router.get("/auth/me", wrap(authMe));
router.get("/auth/shopify/status", requireAdmin, wrap(shopifyOAuthStatus));
router.post("/auth/token", requireAdmin, wrap(createAuthTokenHandler));
router.get("/profile", wrap(getProfileHandler));
router.put("/profile", wrap(updateProfileHandler));
router.get("/company", wrap(getCompanyHandler));
router.put("/company", requireAdmin, wrap(updateCompanyHandler));
router.get("/users", requireAdmin, wrap(listUsersHandler));
router.post("/users", requireAdmin, wrap(createUserHandler));
router.put("/users/:userId", requireAdmin, wrap(updateUserHandler));
router.delete("/users/:userId", requireAdmin, wrap(deleteUserHandler));

router.get("/logs", wrap(listLogs));
router.post("/logs/retry", wrap(retryFailed));

router.get("/alegra/items", wrap(listAlegraItemsHandler));
router.get("/products", wrap(listProductsHandler));
router.get("/alegra/items/:itemId/warehouses", wrap(listItemWarehouseSummaryHandler));
router.get("/alegra/inventory-adjustments", wrap(listInventoryAdjustmentsHandler));
router.get("/alegra/image", wrap(proxyAlegraImageHandler));
router.get("/connections", requireAdmin, wrap(listConnections));
router.post("/connections", requireAdmin, wrap(createConnection));
router.delete("/connections/:id", requireAdmin, wrap(removeConnection));
router.get("/store-configs", requireAdmin, wrap(listStoreConfigsHandler));
router.put("/store-configs/:shopDomain", requireAdmin, wrap(saveStoreConfigHandler));
router.post("/settings/test", requireAdmin, wrap(testConnections));
router.put("/settings", requireAdmin, wrap(updateSettings));
router.get("/settings", requireAdmin, wrap(getSettings));
router.get("/settings/resolutions", wrap(listResolutions));
router.get("/alegra/:catalog", wrap(listAlegraCatalog));
router.get("/metrics", wrap(listMetrics));
router.get("/reports/commerce.csv", wrap(downloadCommerceReportCsvHandler));
router.get("/checkpoints/inventory-adjustments", wrap(getInventoryAdjustmentsCheckpoint));
router.post("/assistant/query", wrap(assistantQueryHandler));
router.post("/assistant/execute", wrap(assistantExecuteHandler));
router.post("/shopify/publish", wrap(publishShopifyHandler));
router.post("/shopify/lookup-batch", wrap(lookupShopifyHandler));
router.post("/shopify/webhooks", requireAdmin, wrap(createShopifyWebhooksHandler));
router.post("/shopify/webhooks/delete", requireAdmin, wrap(deleteShopifyWebhooksHandler));
router.get("/shopify/webhooks/status", requireAdmin, wrap(getShopifyWebhooksStatusHandler));
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
router.post("/sync/contacts", wrap(syncContactHandler));
router.post("/sync/contacts/bulk", wrap(syncContactsBulkHandler));
router.get("/contacts", wrap(listContactsHandler));
router.get("/orders", wrap(listOrdersHandler));
router.get("/invoices", wrap(listInvoicesHandler));
router.get("/invoices/:invoiceId/pdf", wrap(downloadInvoicePdfHandler));
router.get("/operations", wrap(listOperationsHandler));
router.post("/operations/seed", wrap(seedOperationsHandler));
router.post("/operations/:orderId/sync", wrap(syncOperationHandler));
router.post("/operations/:orderId/invoice", wrap(retryInvoiceHandler));
router.get("/operations/:orderId/einvoice", wrap(getEinvoiceOverrideHandler));
router.put("/operations/:orderId/einvoice", wrap(saveEinvoiceOverrideHandler));
router.post("/operations/:orderId/payment", wrap(emitPaymentHandler));
router.post("/operations/:orderId/cancel", wrap(voidInvoiceHandler));

// Marketing (authed)
router.post("/marketing/sync/orders", requireAdmin, wrap(marketingSyncOrdersHandler));
router.post("/marketing/metrics/recompute", requireAdmin, wrap(marketingRecomputeMetricsHandler));
router.post("/marketing/spend", requireAdmin, wrap(marketingUpsertCampaignSpendHandler));
router.get("/marketing/dashboard", wrap(marketingDashboardHandler));
router.get("/marketing/insights", wrap(marketingInsightsHandler));
router.all("/marketing/graphql", wrap(marketingGraphqlHttpHandler));
