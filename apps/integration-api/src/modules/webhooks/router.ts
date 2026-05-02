import { Router } from "express";

import { requireAdmin } from "../auth/guards";
import { handleAlegraWebhook, handleShopifyWebhook } from "./handlers/core-webhooks";
import {
  createShopifyWebhooksHandler,
  deleteShopifyWebhooksHandler,
  getShopifyWebhooksStatusHandler,
} from "./handlers/core-shopify-webhooks";
import {
  marketingPixelConfigHandler,
  marketingPixelRotateKeyHandler,
  marketingWebhooksCreateHandler,
  marketingWebhooksDeleteHandler,
  marketingWebhooksStatusHandler,
} from "./handlers/core-marketing-config";
import { shopifyMarketingWebhookHandler } from "./handlers/core-marketing-webhooks";
import { marketingCollectHandler, marketingPixelScriptHandler } from "./handlers/core-marketing-pixel";
import { wrap } from "../../router-utils";

export function registerPublicWebhookRoutes(router: Router) {
  router.post("/webhooks/shopify", wrap(handleShopifyWebhook));
  router.post("/webhooks/alegra", wrap(handleAlegraWebhook));
  router.post("/marketing/webhooks/shopify", wrap(shopifyMarketingWebhookHandler));
  router.get("/marketing/pixel.js", wrap(marketingPixelScriptHandler));
  router.post("/marketing/collect", wrap(marketingCollectHandler));
}

export function createWebhooksRouter() {
  const router = Router();

  router.get("/marketing/pixel/config", requireAdmin, wrap(marketingPixelConfigHandler));
  router.post("/marketing/pixel/key/rotate", requireAdmin, wrap(marketingPixelRotateKeyHandler));
  router.get("/marketing/webhooks/status", requireAdmin, wrap(marketingWebhooksStatusHandler));
  router.post("/marketing/webhooks/create", requireAdmin, wrap(marketingWebhooksCreateHandler));
  router.post("/marketing/webhooks/delete", requireAdmin, wrap(marketingWebhooksDeleteHandler));
  router.post("/shopify/webhooks", requireAdmin, wrap(createShopifyWebhooksHandler));
  router.post("/shopify/webhooks/delete", requireAdmin, wrap(deleteShopifyWebhooksHandler));
  router.get("/shopify/webhooks/status", requireAdmin, wrap(getShopifyWebhooksStatusHandler));

  return router;
}
