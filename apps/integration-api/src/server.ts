import "dotenv/config";

import { listIntegrationApiModuleKeys } from "./modules";
import { createExpressApp } from "../../../src/runtime/create-app";
import { ensureSaDefaults } from "../../../src/sa/sa.bootstrap";

const app = createExpressApp();
const port = Number(process.env.APP_PORT || process.env.PORT || 10000);
const host = "0.0.0.0";

app.listen(port, host, () => {
  console.log("-------------------------------------------");
  console.log(`[integration-api] listening on http://${host}:${port}`);
  console.log("[integration-api] modules", listIntegrationApiModuleKeys());
  console.log("-------------------------------------------");
  ensureSaDefaults().catch((error) => console.error("[sa] bootstrap failed", error));
});
