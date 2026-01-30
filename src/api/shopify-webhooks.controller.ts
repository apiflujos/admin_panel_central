import type { Request, Response } from "express";
import { ShopifyClient } from "../connectors/shopify";
import { getShopifyConnectionByDomain } from "../services/store-connections.service";

const DEFAULT_TOPICS = [
  "ORDERS_CREATE",
  "ORDERS_UPDATED",
  "REFUNDS_CREATE",
  "INVENTORY_LEVELS_UPDATE",
  "PRODUCTS_UPDATE",
];

function resolveBaseUrl(req: Request) {
  const explicit = process.env.PUBLIC_URL || "";
  if (explicit) return explicit.replace(/\/$/, "");
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0];
  const forwardedHost = String(req.headers["x-forwarded-host"] || "").split(",")[0];
  const proto = forwardedProto || req.protocol || "https";
  const host = forwardedHost || req.headers.host || "";
  if (!host) {
    throw new Error("No se pudo resolver el host de la aplicacion.");
  }
  return `${proto}://${host}`.replace(/\/$/, "");
}

export async function createShopifyWebhooksHandler(req: Request, res: Response) {
  try {
    const shopDomain = String(req.body?.shopDomain || "").trim();
    const connection = await getShopifyConnectionByDomain(shopDomain);
    const baseUrl = resolveBaseUrl(req);
    const callbackUrl = `${baseUrl}/api/webhooks/shopify`;
    const client = new ShopifyClient({
      shopDomain: connection.shopDomain,
      accessToken: connection.accessToken,
    });
    const results = await Promise.all(
      DEFAULT_TOPICS.map(async (topic) => {
        try {
          const data = await client.createWebhookSubscription(topic, callbackUrl);
          const response = data.webhookSubscriptionCreate;
          const errors = response.userErrors || [];
          return {
            topic,
            ok: errors.length === 0,
            errors,
          };
        } catch (error) {
          return {
            topic,
            ok: false,
            errors: [{ message: (error as { message?: string })?.message || "error" }],
          };
        }
      })
    );
    return res.status(200).json({
      ok: results.every((item) => item.ok),
      callbackUrl,
      items: results,
    });
  } catch (error) {
    return res.status(400).json({ error: (error as { message?: string })?.message || "error" });
  }
}
