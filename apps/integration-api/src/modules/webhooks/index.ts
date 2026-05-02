import type { IntegrationApiModule } from "../types";

export const webhooksModule: IntegrationApiModule = {
  key: "webhooks",
  label: "Inbound third-party webhooks",
  mountPaths: ["/api/webhooks/*", "/api/marketing/webhooks/*"],
};
