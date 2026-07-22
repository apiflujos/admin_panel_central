import type { Request, Response } from "express";
import { runWithOrg } from "../db";
import { verifyShopifyHmac } from "../utils/webhook";
import { ingestShopifyMarketingWebhook } from "../marketing/webhooks/shopify-marketing-webhooks.service";
import { resolveOrgIdByShopDomain } from "../services/organizations.service";
import { shopifyStoreExists } from "../services/store-connections.service";

function header(req: Request, name: string) {
  const raw = req.headers[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0] || "";
  return raw ? String(raw) : "";
}

export async function shopifyMarketingWebhookHandler(req: Request, res: Response) {
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody || Buffer.from("");
  const signature = header(req, "x-shopify-hmac-sha256");
  // HMAC PRIMERO.
  const ok = verifyShopifyHmac(rawBody, signature);
  if (!ok) {
    res.status(401).json({ error: "invalid_hmac" });
    return;
  }

  const topic = header(req, "x-shopify-topic");
  const shopDomain = header(req, "x-shopify-shop-domain");
  const webhookId =
    header(req, "x-shopify-webhook-id") || header(req, "x-shopify-delivery-id") || header(req, "x-request-id") || "";
  // Requerimos webhookId real — no sintetizamos con Date.now() (rompía idempotencia y duplicaba attribution).
  if (!webhookId) {
    res.status(400).json({ error: "missing_webhook_id" });
    return;
  }

  const orgId = shopDomain ? await resolveOrgIdByShopDomain(shopDomain) : null;
  if (!orgId) {
    res.status(200).json({ status: "ignored", reason: "unknown_shop" });
    return;
  }

  return runWithOrg(orgId, async () => {
    if (!(await shopifyStoreExists(shopDomain))) {
      res.status(200).json({ status: "ignored", reason: "shop_removed" });
      return;
    }

    try {
      const result = await ingestShopifyMarketingWebhook(
        { topic, shopDomain, webhookId },
        rawBody,
        req.body
      );
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "webhook_error" });
    }
  });
}
