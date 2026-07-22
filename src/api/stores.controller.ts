import type { Request, Response } from "express";
import { createSyncLog } from "../services/logs.service";
import { createStore, deleteStoreById, listStores, updateStoreName } from "../services/stores.service";
import { deleteWooConnectionsByStoreId } from "../services/woocommerce-connections.service";

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "No disponible");

export async function listStoresHandler(_req: Request, res: Response) {
  try {
    const result = await listStores();
    res.status(200).json(result);
    await createSyncLog({
      entity: "stores_list",
      direction: "shopify->alegra",
      status: "success",
      message: "Tiendas cargadas",
      response: result as Record<string, unknown>,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    res.status(400).json({ error: message });
    await createSyncLog({
      entity: "stores_list",
      direction: "shopify->alegra",
      status: "fail",
      message,
    });
  }
}

export async function createStoreHandler(req: Request, res: Response) {
  try {
    const name = String(req.body?.name || "").trim();
    const result = await createStore(name);
    res.status(200).json({ created: result });
    await createSyncLog({
      entity: "stores_create",
      direction: "shopify->alegra",
      status: "success",
      message: "Tienda creada",
      request: { name },
      response: result as Record<string, unknown>,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    res.status(400).json({ error: message });
    await createSyncLog({
      entity: "stores_create",
      direction: "shopify->alegra",
      status: "fail",
      message,
    });
  }
}

export async function updateStoreHandler(req: Request, res: Response) {
  try {
    const storeId = Number(req.params.id);
    if (!Number.isFinite(storeId)) {
      res.status(400).json({ error: "ID invalido" });
      return;
    }
    const name = String(req.body?.name || "").trim();
    const updated = await updateStoreName(storeId, name);
    const result = await listStores();
    res.status(200).json(result);
    await createSyncLog({
      entity: "stores_update",
      direction: "shopify->alegra",
      status: "success",
      message: "Tienda actualizada",
      request: { storeId, name: updated.name },
      response: result as Record<string, unknown>,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    res.status(400).json({ error: message });
    await createSyncLog({
      entity: "stores_update",
      direction: "shopify->alegra",
      status: "fail",
      message,
    });
  }
}

export async function deleteStoreHandler(req: Request, res: Response) {
  try {
    const storeId = Number(req.params.id);
    if (!Number.isFinite(storeId)) {
      res.status(400).json({ error: "ID invalido" });
      return;
    }
    await deleteWooConnectionsByStoreId(storeId).catch(() => ({ deleted: false }));
    await deleteStoreById(storeId);
    const result = await listStores();
    res.status(200).json(result);
    await createSyncLog({
      entity: "stores_delete",
      direction: "shopify->alegra",
      status: "success",
      message: "Tienda eliminada",
      request: { storeId },
      response: result as Record<string, unknown>,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    res.status(400).json({ error: message });
    await createSyncLog({
      entity: "stores_delete",
      direction: "shopify->alegra",
      status: "fail",
      message,
    });
  }
}
