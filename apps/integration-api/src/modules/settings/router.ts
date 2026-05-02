import { Router } from "express";

import { requireAdmin } from "../auth/guards";
import { billingSummaryHandler } from "./handlers/core-billing";
import { listConnectionTestsHandler } from "./handlers/core-connection-tests";
import { getCompanyHandler, updateCompanyHandler } from "./handlers/core-company";
import {
  createConnection,
  listConnections,
  removeAlegraConnection,
  removeConnection,
  removeConnectionByDomain,
} from "./handlers/core-connections";
import { listTenantModulesHandler } from "./handlers/core-modules";
import { getSettings, listAlegraCatalog, listResolutions, testConnections, updateSettings } from "./handlers/core-settings";
import { listStoreConfigsHandler, saveStoreConfigHandler } from "./handlers/core-store-configs";
import { createStoreHandler, deleteStoreHandler, listStoresHandler } from "./handlers/core-stores";
import {
  createWooConnectionHandler,
  deleteWooConnectionHandler,
  listWooConnectionsHandler,
} from "./handlers/core-woocommerce-connections";
import { getAdminWebConnectionsStatusHandler, getAdminWebSettingsOverviewHandler } from "./handlers/admin-web-settings";
import { wrap } from "../../router-utils";

export function createSettingsRouter() {
  const router = Router();

  router.get("/modules", requireAdmin, wrap(listTenantModulesHandler));
  router.get("/billing/summary", wrap(billingSummaryHandler));
  router.get("/admin-web/settings/overview", requireAdmin, wrap(getAdminWebSettingsOverviewHandler));
  router.get("/admin-web/connections/status", requireAdmin, wrap(getAdminWebConnectionsStatusHandler));
  router.get("/connections", requireAdmin, wrap(listConnections));
  router.get("/connections/tests", requireAdmin, wrap(listConnectionTestsHandler));
  router.post("/connections", requireAdmin, wrap(createConnection));
  router.delete("/connections/domain/:shopDomain", requireAdmin, wrap(removeConnectionByDomain));
  router.delete("/connections/:id", requireAdmin, wrap(removeConnection));
  router.delete("/connections/alegra/:storeId", requireAdmin, wrap(removeAlegraConnection));
  router.get("/stores", requireAdmin, wrap(listStoresHandler));
  router.post("/stores", requireAdmin, wrap(createStoreHandler));
  router.delete("/stores/:id", requireAdmin, wrap(deleteStoreHandler));
  router.get("/woocommerce/connections", requireAdmin, wrap(listWooConnectionsHandler));
  router.post("/woocommerce/connections", requireAdmin, wrap(createWooConnectionHandler));
  router.delete("/woocommerce/connections/:shopDomain", requireAdmin, wrap(deleteWooConnectionHandler));
  router.get("/store-configs", requireAdmin, wrap(listStoreConfigsHandler));
  router.put("/store-configs/:storeKey", requireAdmin, wrap(saveStoreConfigHandler));
  router.post("/settings/test", requireAdmin, wrap(testConnections));
  router.put("/settings", requireAdmin, wrap(updateSettings));
  router.get("/settings", requireAdmin, wrap(getSettings));
  router.get("/settings/resolutions", wrap(listResolutions));
  router.get("/alegra/:catalog", wrap(listAlegraCatalog));
  router.get("/company", wrap(getCompanyHandler));
  router.put("/company", requireAdmin, wrap(updateCompanyHandler));

  return router;
}
