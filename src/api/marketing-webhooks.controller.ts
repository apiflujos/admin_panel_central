import type { Request, Response } from "express";
import { verifyShopifyHmac } from "../utils/webhook";
import { ingestShopifyMarketingWebhook } from "../marketing/webhooks/shopify-marketing-webhooks.service";
import { shopifyStoreExists } from "../services/store-connections.service";

function header(req: Request, name: string) {
  const raw = req.headers[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0] || "";
  return raw ? String(raw) : "";
}

export async function shopifyMarketingWebhookHandler(req: Request, res: Response) {
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody || Buffer.from("");
  const signature = header(req, "x-shopify-hmac-sha256");
  const ok = verifyShopifyHmac(rawBody, signature);
  if (!ok) {
    res.status(401).json({ error: "invalid_hmac" });
    return;
  }

  const topic = header(req, "x-shopify-topic");
  const shopDomain = header(req, "x-shopify-shop-domain");
  const webhookId =
    header(req, "x-shopify-webhook-id") ||
    header(req, "x-shopify-delivery-id") ||
    header(req, "x-request-id") ||
    "";

  if (shopDomain && !(await shopifyStoreExists(shopDomain))) {
    res.status(410).json({ status: "gone" });
    return;
  }

  try {
    const result = await ingestShopifyMarketingWebhook(
      { topic, shopDomain, webhookId: webhookId || `${Date.now()}` },
      rawBody,
      req.body
    );
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "webhook_error" });
  }
}
