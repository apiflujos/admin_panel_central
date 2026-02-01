import type { Request, Response } from "express";
import { ShopifyClient } from "../connectors/shopify";
import { checkConnectionStatus, getGlobalToolkitConfig, getStoreToolkitConfig, listToolkitErrors, reinstallShopifyWebhooks, saveGlobalToolkitConfig, saveStoreToolkitConfig } from "../services/toolkit.service";
import { getShopifyConnectionDetails } from "../services/store-connections.service";
import { syncShopifyOrderToAlegra } from "../services/shopify-to-alegra.service";

const normalizeShopDomain = (value: string) =>
  value
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();

export async function getToolkitGlobalConfigHandler(_req: Request, res: Response) {
  try {
    const config = await getGlobalToolkitConfig();
    res.status(200).json({ config });
  } catch (error) {
    res.status(500).json({ error: (error as { message?: string })?.message || "No disponible" });
  }
}

export async function saveToolkitGlobalConfigHandler(req: Request, res: Response) {
  try {
    const payload = (req.body || {}) as Record<string, unknown>;
    const result = await saveGlobalToolkitConfig(payload);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: (error as { message?: string })?.message || "No disponible" });
  }
}

export async function getToolkitStoreConfigHandler(req: Request, res: Response) {
  try {
    const shopDomain = normalizeShopDomain(String(req.params.shopDomain || ""));
    const config = await getStoreToolkitConfig(shopDomain);
    res.status(200).json(config);
  } catch (error) {
    res.status(400).json({ error: (error as { message?: string })?.message || "No disponible" });
  }
}

export async function saveToolkitStoreConfigHandler(req: Request, res: Response) {
  try {
    const shopDomain = normalizeShopDomain(String(req.params.shopDomain || ""));
    const payload = (req.body || {}) as Record<string, unknown>;
    const result = await saveStoreToolkitConfig(shopDomain, payload);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: (error as { message?: string })?.message || "No disponible" });
  }
}

export async function toolkitHealthHandler(req: Request, res: Response) {
  try {
    const shopDomain = normalizeShopDomain(String(req.query.shopDomain || req.body?.shopDomain || ""));
    if (!shopDomain) {
      res.status(400).json({ error: "Dominio Shopify requerido" });
      return;
    }
    const report = await checkConnectionStatus(shopDomain, req);
    res.status(200).json(report);
  } catch (error) {
    res.status(400).json({ error: (error as { message?: string })?.message || "No disponible" });
  }
}

export async function toolkitReinstallWebhooksHandler(req: Request, res: Response) {
  try {
    const shopDomain = normalizeShopDomain(String(req.body?.shopDomain || ""));
    if (!shopDomain) {
      res.status(400).json({ error: "Dominio Shopify requerido" });
      return;
    }
    const result = await reinstallShopifyWebhooks(shopDomain, req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: (error as { message?: string })?.message || "No disponible" });
  }
}

export async function toolkitLogsHandler(req: Request, res: Response) {
  try {
    const shopDomain = normalizeShopDomain(String(req.query.shopDomain || ""));
    let limit = Number(req.query.limit || 0);
    if (!limit) {
      if (shopDomain) {
        const storeConfig = await getStoreToolkitConfig(shopDomain);
        limit = storeConfig.config.logs.limit;
      } else {
        const globalConfig = await getGlobalToolkitConfig();
        limit = globalConfig.logs.limit;
      }
    }
    const items = await listToolkitErrors(limit || 20);
    res.status(200).json({ items });
  } catch (error) {
    res.status(500).json({ error: (error as { message?: string })?.message || "No disponible" });
  }
}

export async function toolkitForceSyncHandler(req: Request, res: Response) {
  try {
    const shopDomain = normalizeShopDomain(String(req.body?.shopDomain || ""));
    const orderIdInput = String(req.body?.orderId || "").trim();
    const orderNumberInput = String(req.body?.orderNumber || "").trim();
    if (!shopDomain) {
      res.status(400).json({ error: "Dominio Shopify requerido" });
      return;
    }
    if (!orderIdInput && !orderNumberInput) {
      res.status(400).json({ error: "ID o numero de pedido requerido" });
      return;
    }

    const storeConfig = await getStoreToolkitConfig(shopDomain);
    const config = storeConfig.config;
    const force = (req.body?.force || {}) as {
      createOrder?: boolean;
      createInvoice?: boolean;
      skipRules?: boolean;
    };
    const allow = config.forceSync;
    const createOrder = allow.allowCreateOrder && force.createOrder !== false;
    const createInvoice = allow.allowCreateInvoice && Boolean(force.createInvoice);
    const skipRules = allow.allowSkipRules && Boolean(force.skipRules);

    if (!createOrder && !createInvoice) {
      res.status(400).json({ error: "No hay acciones habilitadas para forzar" });
      return;
    }

    const shopifyDetails = await getShopifyConnectionDetails(shopDomain);
    const client = new ShopifyClient({
      shopDomain: shopifyDetails.shopDomain,
      accessToken: shopifyDetails.accessToken,
    });

    let orderPayload: Record<string, unknown> | null = null;
    if (orderIdInput) {
      const gid = orderIdInput.startsWith("gid://")
        ? orderIdInput
        : `gid://shopify/Order/${orderIdInput}`;
      const data = await client.getOrderById(gid);
      orderPayload = data.order as unknown as Record<string, unknown>;
    } else if (orderNumberInput) {
      const query = `name:${orderNumberInput.replace(/^#/, "")}`;
      const orders = await client.listAllOrdersByQuery(query, 1);
      orderPayload = (orders[0] || null) as unknown as Record<string, unknown>;
    }

    if (!orderPayload) {
      res.status(404).json({ error: "Pedido no encontrado" });
      return;
    }

    orderPayload.__shopDomain = shopDomain;

    const result = await syncShopifyOrderToAlegra(orderPayload, {
      generateInvoice: createInvoice,
      skipRules,
    });

    res.status(200).json({
      ok: true,
      result,
      forced: { createOrder, createInvoice, skipRules },
    });
  } catch (error) {
    res.status(400).json({ error: (error as { message?: string })?.message || "No disponible" });
  }
}
