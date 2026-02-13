import type { Request, Response } from "express";
import { createSyncLog } from "../services/logs.service";
import { listStoreConfigs, saveStoreConfig } from "../services/store-configs.service";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "No disponible";

export async function listStoreConfigsHandler(_req: Request, res: Response) {
  try {
    const result = await listStoreConfigs();
    res.status(200).json({ items: result });
    await createSyncLog({
      entity: "store_configs_list",
      direction: "shopify->alegra",
      status: "success",
      message: "Store configs cargados",
      response: { count: result.length },
    });
  } catch (error) {
    const message = getErrorMessage(error);
    res.status(400).json({ error: message });
    await createSyncLog({
      entity: "store_configs_list",
      direction: "shopify->alegra",
      status: "fail",
      message,
    });
  }
}

export async function saveStoreConfigHandler(req: Request, res: Response) {
  try {
    const shopDomain = req.params.shopDomain || "";
    const payload = req.body || {};
    const result = await saveStoreConfig(shopDomain, payload);
    res.status(200).json(result);
    await createSyncLog({
      entity: "store_configs_save",
      direction: "shopify->alegra",
      status: "success",
      message: "Store config actualizado",
      request: { shopDomain },
    });
  } catch (error) {
    const message = getErrorMessage(error);
    res.status(400).json({ error: message });
    await createSyncLog({
      entity: "store_configs_save",
      direction: "shopify->alegra",
      status: "fail",
      message,
      request: { shopDomain: req.params.shopDomain },
    });
  }
}
