import { Router } from "express";

import { marketingGraphqlHttpHandler } from "../../../../../src/marketing/graphql/marketing-graphql";
import { requireAdmin, requireSuperAdmin } from "../auth/guards";
import { getAdminWebContactsHandler } from "./handlers/admin-web-contacts";
import { getAdminWebDashboardHandler } from "./handlers/admin-web-dashboard";
import { getAdminWebInvoicesHandler } from "./handlers/admin-web-invoices";
import { getAdminWebLogsHandler } from "./handlers/admin-web-logs";
import { getAdminWebMarketingOverviewHandler } from "./handlers/admin-web-marketing";
import { listContactsHandler, syncContactHandler, syncContactsBulkHandler } from "./handlers/core-contacts";
import { downloadInvoicePdfHandler, listInvoicesHandler } from "./handlers/core-invoices";
import {
  marketingDashboardHandler,
  marketingInsightsHandler,
  marketingRecomputeMetricsHandler,
  marketingSyncOrdersHandler,
  marketingUpsertCampaignSpendHandler,
} from "./handlers/core-marketing";
import { listMetrics } from "./handlers/core-metrics";
import { getAdminWebOperationsHandler } from "./handlers/admin-web-operations";
import { emitPaymentHandler, voidInvoiceHandler } from "./handlers/core-operations-actions";
import {
  getEinvoiceOverrideHandler,
  listOperationsHandler,
  retryInvoiceHandler,
  saveEinvoiceOverrideHandler,
  seedOperationsHandler,
  syncOperationHandler,
} from "./handlers/core-operations";
import { downloadCommerceReportCsvHandler } from "./handlers/core-reports";
import {
  saAssignPlanHandler,
  saGetPlanLimitsHandler,
  saGetTenantPlanSnapshotHandler,
  saListModulesHandler,
  saListPlansHandler,
  saListServicesHandler,
  saListTenantModulesHandler,
  saListTenantsHandler,
  saResetCountersHandler,
  saSetTenantModuleHandler,
  saTenantSummaryHandler,
  saUpsertPlanLimitHandler,
  saUpsertServiceHandler,
} from "./handlers/core-superadmin";
import { saCreateUserHandler, saDeleteUserHandler, saListUsersHandler, saUpdateUserHandler } from "./handlers/core-superadmin-users";
import { getAdminWebSuperAdminOverviewHandler } from "./handlers/admin-web-superadmin";
import { wrap } from "../../router-utils";

export function createOperationsRouter() {
  const router = Router();

  router.get("/admin-web/dashboard", requireAdmin, wrap(getAdminWebDashboardHandler));
  router.get("/admin-web/contacts", requireAdmin, wrap(getAdminWebContactsHandler));
  router.get("/admin-web/invoices", requireAdmin, wrap(getAdminWebInvoicesHandler));
  router.get("/admin-web/marketing/overview", requireAdmin, wrap(getAdminWebMarketingOverviewHandler));
  router.get("/admin-web/logs", requireSuperAdmin, wrap(getAdminWebLogsHandler));
  router.get("/admin-web/superadmin/overview", requireSuperAdmin, wrap(getAdminWebSuperAdminOverviewHandler));
  router.get("/admin-web/operations", requireAdmin, wrap(getAdminWebOperationsHandler));
  router.get("/metrics", wrap(listMetrics));
  router.get("/reports/commerce.csv", wrap(downloadCommerceReportCsvHandler));
  router.get("/operations", wrap(listOperationsHandler));
  router.post("/operations/seed", wrap(seedOperationsHandler));
  router.post("/operations/:orderId/sync", wrap(syncOperationHandler));
  router.post("/operations/:orderId/invoice", wrap(retryInvoiceHandler));
  router.get("/operations/:orderId/einvoice", wrap(getEinvoiceOverrideHandler));
  router.put("/operations/:orderId/einvoice", wrap(saveEinvoiceOverrideHandler));
  router.post("/operations/:orderId/payment", wrap(emitPaymentHandler));
  router.post("/operations/:orderId/cancel", wrap(voidInvoiceHandler));
  router.post("/sync/contacts", wrap(syncContactHandler));
  router.post("/sync/contacts/bulk", wrap(syncContactsBulkHandler));
  router.get("/contacts", wrap(listContactsHandler));
  router.get("/invoices", wrap(listInvoicesHandler));
  router.get("/invoices/:invoiceId/pdf", wrap(downloadInvoicePdfHandler));

  router.post("/marketing/sync/orders", requireAdmin, wrap(marketingSyncOrdersHandler));
  router.post("/marketing/metrics/recompute", requireAdmin, wrap(marketingRecomputeMetricsHandler));
  router.post("/marketing/spend", requireAdmin, wrap(marketingUpsertCampaignSpendHandler));
  router.get("/marketing/dashboard", wrap(marketingDashboardHandler));
  router.get("/marketing/insights", wrap(marketingInsightsHandler));
  router.all("/marketing/graphql", wrap(marketingGraphqlHttpHandler));

  router.get("/sa/tenants", requireSuperAdmin, wrap(saListTenantsHandler));
  router.get("/sa/plans", requireSuperAdmin, wrap(saListPlansHandler));
  router.get("/sa/modules", requireSuperAdmin, wrap(saListModulesHandler));
  router.get("/sa/tenant/modules", requireSuperAdmin, wrap(saListTenantModulesHandler));
  router.get("/sa/services", requireSuperAdmin, wrap(saListServicesHandler));
  router.post("/sa/services", requireSuperAdmin, wrap(saUpsertServiceHandler));
  router.get("/sa/users", requireSuperAdmin, wrap(saListUsersHandler));
  router.post("/sa/users", requireSuperAdmin, wrap(saCreateUserHandler));
  router.put("/sa/users/:userId", requireSuperAdmin, wrap(saUpdateUserHandler));
  router.delete("/sa/users/:userId", requireSuperAdmin, wrap(saDeleteUserHandler));
  router.get("/sa/tenant/plan", requireSuperAdmin, wrap(saGetTenantPlanSnapshotHandler));
  router.get("/sa/plan/limits", requireSuperAdmin, wrap(saGetPlanLimitsHandler));
  router.post("/sa/plan/limits", requireSuperAdmin, wrap(saUpsertPlanLimitHandler));
  router.post("/sa/modules/toggle", requireSuperAdmin, wrap(saSetTenantModuleHandler));
  router.post("/sa/plans/assign", requireSuperAdmin, wrap(saAssignPlanHandler));
  router.get("/sa/usage", requireSuperAdmin, wrap(saTenantSummaryHandler));
  router.post("/sa/reset", requireSuperAdmin, wrap(saResetCountersHandler));

  return router;
}
