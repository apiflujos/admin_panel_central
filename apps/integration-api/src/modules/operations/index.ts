import type { IntegrationApiModule } from "../types";

export const operationsModule: IntegrationApiModule = {
  key: "operations",
  label: "Operational actions, reports and business workflows",
  mountPaths: ["/api/operations", "/api/invoices", "/api/contacts", "/api/reports", "/api/marketing"],
};
