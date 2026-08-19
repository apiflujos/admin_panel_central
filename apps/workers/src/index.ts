import { startBillingReportWorker } from "./cron/billing-report";
import { startLogRetentionWorker } from "./cron/log-retention";
import { startMarketingWorker } from "./cron/marketing";
import { startInventoryAdjustmentsWorker } from "./pollers/inventory-adjustments";
import { startOrdersSyncWorker } from "./pollers/orders-sync";
import { startProductsSyncWorker } from "./pollers/products-sync";
import { startRetryQueueWorker } from "./retry-queue";
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
    key: "cron",
    label: "Marketing and billing cron",
    jobs: ["marketing", "billing-report", "log-retention"],
  },
];

export function startWorkersRuntime() {
  startInventoryAdjustmentsWorker();
  startOrdersSyncWorker();
  startProductsSyncWorker();
  startRetryQueueWorker();
  startMarketingWorker();
  startBillingReportWorker();
  startLogRetentionWorker();
}
