import { startAlegraReconcileWorker } from "./cron/alegra-reconcile";
import { startBillingReportWorker } from "./cron/billing-report";
import { startHealthMonitorWorker } from "./cron/health-monitor";
import { startLogRetentionWorker } from "./cron/log-retention";
import { startInventoryAdjustmentsWorker } from "./pollers/inventory-adjustments";
import { startOrdersSyncWorker } from "./pollers/orders-sync";
import { startProductsSyncWorker } from "./pollers/products-sync";
import { startRetryQueueWorker } from "./retry-queue";
import { startWebhookDispatchWorker } from "./webhook-dispatch";
import { verificarPermisosDeEscritura } from "./guardia-escritura";
import type { WorkerRuntimeGroup } from "./types";

export const workerRuntimeGroups: WorkerRuntimeGroup[] = [
  {
    key: "pollers",
    label: "Shopify/Alegra pollers",
    jobs: ["inventory-adjustments", "orders-sync", "products-sync"],
  },
  {
    key: "retry-queue",
    label: "Retry queue",
    jobs: ["retry-queue"],
  },
  {
    key: "webhook-dispatch",
    label: "Webhook dispatch (Redis)",
    jobs: ["webhook-dispatch"],
  },
  {
    key: "cron",
    label: "Billing and maintenance cron",
    jobs: ["billing-report", "log-retention", "health-monitor", "alegra-reconcile"],
  },
];

export function startWorkersRuntime() {
  // Doble check automático: deja constancia en el log de qué puede escribir
  // cada tienda ANTES de que los pollers empiecen a trabajar.
  void verificarPermisosDeEscritura();

  startInventoryAdjustmentsWorker();
  startOrdersSyncWorker();
  startProductsSyncWorker();
  startRetryQueueWorker();
  startWebhookDispatchWorker();
  startBillingReportWorker();
  startLogRetentionWorker();
  startHealthMonitorWorker();
  startAlegraReconcileWorker();
}
