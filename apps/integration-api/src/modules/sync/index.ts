import type { IntegrationApiModule } from "../types";

export const syncModule: IntegrationApiModule = {
  key: "sync",
  label: "Catalog, orders and synchronization flows",
  mountPaths: ["/api/products", "/api/orders", "/api/invoices/sync", "/api/store-sync", "/api/checkpoints", "/api/logs"],
};
