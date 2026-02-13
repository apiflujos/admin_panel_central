import type { Request, Response } from "express";
import { ShopifyClient } from "../connectors/shopify";
import { getOrCreatePixelKey, rotatePixelKey } from "../marketing/db/marketing.repository";
import { getShopifyConnectionByDomain } from "../services/store-connections.service";

function normalizeShopDomain(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();
}

function resolveBaseUrl(req: Request) {
  const explicit = String(process.env.APP_HOST || "").trim();
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

const MARKETING_TOPICS = [
  "ORDERS_CREATE",
  "ORDERS_PAID",
  "ORDERS_UPDATED",
  "CHECKOUTS_CREATE",
  "CHECKOUTS_UPDATE",
  "CUSTOMERS_CREATE",
];

function normalizeUrl(value: string) {
  return value.replace(/\/$/, "").toLowerCase();
}

export async function marketingPixelConfigHandler(req: Request, res: Response) {
  try {
    const shopDomain = normalizeShopDomain(req.query.shopDomain);
    if (!shopDomain) {
      res.status(400).json({ error: "shopDomain requerido" });
      return;
    }
    const { pixelKey } = await getOrCreatePixelKey(shopDomain);
    const baseUrl = resolveBaseUrl(req);
    const pixelScriptUrl = `${baseUrl}/api/marketing/pixel.js?key=${encodeURIComponent(pixelKey)}`;
    const webhookUrl = `${baseUrl}/api/marketing/webhooks/shopify`;
    res.status(200).json({
      shopDomain,
      pixelKey,
      pixelScriptUrl,
      pixelScriptTag: `<script src="${pixelScriptUrl}" async></script>`,
      webhookUrl,
      webhookTopics: MARKETING_TOPICS,
      envKeyConfigured: Boolean(String(process.env.MARKETING_PIXEL_KEY || "").trim()),
    });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "pixel_config_error" });
  }
}

export async function marketingPixelRotateKeyHandler(req: Request, res: Response) {
  try {
    const shopDomain = normalizeShopDomain(req.body?.shopDomain);
    if (!shopDomain) {
      res.status(400).json({ error: "shopDomain requerido" });
      return;
    }
    const { pixelKey } = await rotatePixelKey(shopDomain);
    const baseUrl = resolveBaseUrl(req);
    const pixelScriptUrl = `${baseUrl}/api/marketing/pixel.js?key=${encodeURIComponent(pixelKey)}`;
    const webhookUrl = `${baseUrl}/api/marketing/webhooks/shopify`;
    res.status(200).json({
      shopDomain,
      pixelKey,
      pixelScriptUrl,
      pixelScriptTag: `<script src="${pixelScriptUrl}" async></script>`,
      webhookUrl,
      webhookTopics: MARKETING_TOPICS,
      envKeyConfigured: Boolean(String(process.env.MARKETING_PIXEL_KEY || "").trim()),
    });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "pixel_rotate_error" });
  }
}

export async function marketingWebhooksStatusHandler(req: Request, res: Response) {
  try {
    const shopDomain = normalizeShopDomain(req.query.shopDomain || req.body?.shopDomain);
    if (!shopDomain) {
      res.status(400).json({ error: "shopDomain requerido" });
      return;
    }
    const connection = await getShopifyConnectionByDomain(shopDomain);
    const baseUrl = resolveBaseUrl(req);
    const client = new ShopifyClient({
      shopDomain: connection.shopDomain,
      accessToken: connection.accessToken,
    });
    const data = await client.listWebhookSubscriptions(50);
    const edges = data.webhookSubscriptions?.edges || [];
    const expectedCallback = normalizeUrl(`${baseUrl}/api/marketing/webhooks/shopify`);
    const topics = new Set<string>();
    edges.forEach((edge: any) => {
      const node = edge.node;
      const endpointUrl = node.endpoint?.callbackUrl || "";
      if (endpointUrl && normalizeUrl(endpointUrl) === expectedCallback) {
        topics.add(String(node.topic));
      }
    });
    const missing = MARKETING_TOPICS.filter((topic) => !topics.has(topic));
    res.status(200).json({
      ok: missing.length === 0,
      total: MARKETING_TOPICS.length,
      connected: topics.size,
      missing,
      callbackUrl: `${baseUrl}/api/marketing/webhooks/shopify`,
    });
  } catch (error) {
    res.status(400).json({ error: (error as { message?: string })?.message || "error" });
  }
}

export async function marketingWebhooksCreateHandler(req: Request, res: Response) {
  try {
    const shopDomain = normalizeShopDomain(req.body?.shopDomain);
    if (!shopDomain) {
      res.status(400).json({ error: "shopDomain requerido" });
      return;
    }
    const connection = await getShopifyConnectionByDomain(shopDomain);
    const baseUrl = resolveBaseUrl(req);
    const callbackUrl = `${baseUrl}/api/marketing/webhooks/shopify`;
    const client = new ShopifyClient({
      shopDomain: connection.shopDomain,
      accessToken: connection.accessToken,
    });
    const results = await Promise.all(
      MARKETING_TOPICS.map(async (topic) => {
        try {
          const data = await client.createWebhookSubscription(topic, callbackUrl);
          const response = (data as any).webhookSubscriptionCreate;
          const errors = response?.userErrors || [];
          return { topic, ok: errors.length === 0, errors };
        } catch (error) {
          return { topic, ok: false, errors: [{ message: (error as any)?.message || "error" }] };
        }
      })
    );
    res.status(200).json({
      ok: results.every((item) => item.ok),
      callbackUrl,
      items: results,
    });
  } catch (error) {
    res.status(400).json({ error: (error as { message?: string })?.message || "error" });
  }
}

export async function marketingWebhooksDeleteHandler(req: Request, res: Response) {
  try {
    const shopDomain = normalizeShopDomain(req.body?.shopDomain);
    if (!shopDomain) {
      res.status(400).json({ error: "shopDomain requerido" });
      return;
    }
    const connection = await getShopifyConnectionByDomain(shopDomain);
    const baseUrl = resolveBaseUrl(req);
    const expectedCallback = normalizeUrl(`${baseUrl}/api/marketing/webhooks/shopify`);
    const client = new ShopifyClient({
      shopDomain: connection.shopDomain,
      accessToken: connection.accessToken,
    });
    const data = await client.listWebhookSubscriptions(50);
    const edges = data.webhookSubscriptions?.edges || [];
    const toDelete = edges.filter((edge: any) => {
      const node = edge.node;
      const endpointUrl = node.endpoint?.callbackUrl || "";
      return endpointUrl && normalizeUrl(endpointUrl) === expectedCallback;
    });
    const results = await Promise.all(
      toDelete.map(async (edge: any) => {
        try {
          const id = edge.node?.id;
          const topic = edge.node?.topic;
          const response = await client.deleteWebhookSubscription(id);
          const errors = response.webhookSubscriptionDelete?.userErrors || [];
          return { id, topic, ok: errors.length === 0, errors };
        } catch (error) {
          return { id: edge.node?.id, topic: edge.node?.topic, ok: false, errors: [{ message: (error as any)?.message || "error" }] };
        }
      })
    );
    res.status(200).json({
      ok: results.every((item) => item.ok),
      deleted: results.length,
      items: results,
      callbackUrl: `${baseUrl}/api/marketing/webhooks/shopify`,
    });
  } catch (error) {
    res.status(400).json({ error: (error as { message?: string })?.message || "error" });
  }
}
