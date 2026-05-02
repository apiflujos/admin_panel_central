import { Router } from "express";

import { authMiddleware, requireCsrf } from "./modules/auth/guards";
import { createAuthRouter, registerPublicAuthRoutes } from "./modules/auth/router";
import { createOperationsRouter } from "./modules/operations/router";
import { createSettingsRouter } from "./modules/settings/router";
import { createSyncRouter } from "./modules/sync/router";
import { createWebhooksRouter, registerPublicWebhookRoutes } from "./modules/webhooks/router";
import { wrap } from "./router-utils";

export function createIntegrationApiRouter() {
  const router = Router();

  registerPublicWebhookRoutes(router);
  registerPublicAuthRoutes(router);

  const protectedRouter = Router();
  protectedRouter.use(wrap(authMiddleware));
  protectedRouter.use(wrap(requireCsrf));
  protectedRouter.use(createAuthRouter());
  protectedRouter.use(createSettingsRouter());
  protectedRouter.use(createSyncRouter());
  protectedRouter.use(createWebhooksRouter());
  protectedRouter.use(createOperationsRouter());

  router.use(protectedRouter);

  return router;
}
