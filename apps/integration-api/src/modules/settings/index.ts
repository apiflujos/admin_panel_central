import type { IntegrationApiModule } from "../types";

export const settingsModule: IntegrationApiModule = {
  key: "settings",
  label: "Tenant settings and connections",
  mountPaths: ["/api/settings", "/api/company", "/api/connections", "/api/store-configs", "/api/stores"],
};
