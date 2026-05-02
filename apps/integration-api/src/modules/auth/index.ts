import type { IntegrationApiModule } from "../types";

export const authModule: IntegrationApiModule = {
  key: "auth",
  label: "Authentication and OAuth",
  mountPaths: ["/api/auth", "/api/profile", "/auth/*"],
};
