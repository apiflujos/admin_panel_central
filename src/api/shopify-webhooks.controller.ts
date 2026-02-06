import type { Request, Response } from "express";
import { ShopifyClient } from "../connectors/shopify";
import { getShopifyConnectionByDomain } from "../services/store-connections.service";

const DEFAULT_TOPICS = [
  "ORDERS_CREATE",
  "ORDERS_UPDATED",
  "ORDERS_PAID",
  "REFUNDS_CREATE",
  "INVENTORY_LEVELS_UPDATE",
  "PRODUCTS_CREATE",
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

function normalizeUrl(value: string) {
  return value.replace(/\/$/, "").toLowerCase();
}

type RegisterWebhooksParams = {
  client: ShopifyClient;
  baseUrl: string;
};

export async function registerShopifyWebhooks(params: RegisterWebhooksParams) {
  const baseUrl = params.baseUrl.replace(/\/$/, "");
  const callbackUrl = `${baseUrl}/api/webhooks/shopify`;
  const results = await Promise.all(
    DEFAULT_TOPICS.map(async (topic) => {
      try {
        const data = await params.client.createWebhookSubscription(topic, callbackUrl);
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
  return {
    ok: results.every((item) => item.ok),
    callbackUrl,
    items: results,
  };
}

export async function getShopifyWebhooksStatusHandler(req: Request, res: Response) {
  try {
    const shopDomain = String(req.query?.shopDomain || req.body?.shopDomain || "").trim();
    const connection = await getShopifyConnectionByDomain(shopDomain);
    const baseUrl = resolveBaseUrl(req);
    const client = new ShopifyClient({
      shopDomain: connection.shopDomain,
      accessToken: connection.accessToken,
    });
    const data = await client.listWebhookSubscriptions(50);
    const edges = data.webhookSubscriptions?.edges || [];
    const expectedCallback = normalizeUrl(`${baseUrl}/api/webhooks/shopify`);
    const topics = new Set<string>();
    edges.forEach((edge) => {
      const node = edge.node;
      const endpointUrl = node.endpoint?.callbackUrl || "";
      if (endpointUrl && normalizeUrl(endpointUrl) === expectedCallback) {
        topics.add(String(node.topic));
      }
    });
    const missing = DEFAULT_TOPICS.filter((topic) => !topics.has(topic));
    res.status(200).json({
      ok: missing.length === 0,
      total: DEFAULT_TOPICS.length,
      connected: topics.size,
      missing,
      callbackUrl: `${baseUrl}/api/webhooks/shopify`,
    });
  } catch (error) {
    res.status(400).json({ error: (error as { message?: string })?.message || "error" });
  }
}

export async function createShopifyWebhooksHandler(req: Request, res: Response) {
  try {
    const shopDomain = String(req.body?.shopDomain || "").trim();
    const connection = await getShopifyConnectionByDomain(shopDomain);
    const baseUrl = resolveBaseUrl(req);
    const client = new ShopifyClient({
      shopDomain: connection.shopDomain,
      accessToken: connection.accessToken,
    });
    const result = await registerShopifyWebhooks({ client, baseUrl });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ error: (error as { message?: string })?.message || "error" });
  }
}

export async function deleteShopifyWebhooksHandler(req: Request, res: Response) {
  try {
    const shopDomain = String(req.body?.shopDomain || "").trim();
    const connection = await getShopifyConnectionByDomain(shopDomain);
    const baseUrl = resolveBaseUrl(req);
    const client = new ShopifyClient({
      shopDomain: connection.shopDomain,
      accessToken: connection.accessToken,
    });
    const data = await client.listWebhookSubscriptions(100);
    const edges = data.webhookSubscriptions?.edges || [];
    const expectedCallback = normalizeUrl(`${baseUrl}/api/webhooks/shopify`);
    const targets = edges.filter((edge) => {
      const endpointUrl = edge.node.endpoint?.callbackUrl || "";
      return endpointUrl && normalizeUrl(endpointUrl) === expectedCallback;
    });
    const results = await Promise.all(
      targets.map(async (edge) => {
        try {
          const response = await client.deleteWebhookSubscription(edge.node.id);
          const payload = response.webhookSubscriptionDelete;
          return {
            id: edge.node.id,
            ok: payload.userErrors.length === 0,
            errors: payload.userErrors || [],
          };
        } catch (error) {
          return {
            id: edge.node.id,
            ok: false,
            errors: [{ message: (error as { message?: string })?.message || "error" }],
          };
        }
      })
    );
    const deleted = results.filter((item) => item.ok).length;
    return res.status(200).json({
      ok: deleted === targets.length,
      deleted,
      total: targets.length,
      items: results,
    });
  } catch (error) {
    return res.status(400).json({ error: (error as { message?: string })?.message || "error" });
  }
}
