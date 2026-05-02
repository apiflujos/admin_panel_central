import { authModule } from "./auth";
import { operationsModule } from "./operations";
import { settingsModule } from "./settings";
import { syncModule } from "./sync";
import type { IntegrationApiModule } from "./types";
import { webhooksModule } from "./webhooks";

export const integrationApiModules: IntegrationApiModule[] = [
  authModule,
  settingsModule,
  syncModule,
  webhooksModule,
  operationsModule,
];

export const listIntegrationApiModuleKeys = () => integrationApiModules.map((module) => module.key);
