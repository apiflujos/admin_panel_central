import type { Request, Response } from "express";
import { createSyncLog } from "../services/logs.service";
import {
  deleteStoreConnection,
  listStoreConnections,
  upsertStoreConnection,
} from "../services/store-connections.service";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "No disponible";

export async function listConnections(_req: Request, res: Response) {
  try {
    const result = await listStoreConnections();
    res.status(200).json(result);
    await createSyncLog({
      entity: "connections_list",
      direction: "shopify->alegra",
      status: "success",
      message: "Conexiones cargadas",
      response: result as Record<string, unknown>,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    res.status(400).json({ error: message });
    await createSyncLog({
      entity: "connections_list",
      direction: "shopify->alegra",
      status: "fail",
      message,
    });
  }
}

export async function createConnection(req: Request, res: Response) {
  try {
    const payload = req.body || {};
    const result = await upsertStoreConnection({
      storeName: payload?.storeName || "",
      shopDomain: payload?.shopify?.shopDomain || "",
      accessToken: payload?.shopify?.accessToken || "",
      alegra: payload?.alegra || undefined,
    });
    const list = await listStoreConnections();
    res.status(200).json({ created: result, ...list });
    await createSyncLog({
      entity: "connections_create",
      direction: "shopify->alegra",
      status: "success",
      message: "Conexion creada",
      request: { shopDomain: payload?.shopify?.shopDomain },
      response: result as Record<string, unknown>,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    res.status(400).json({ error: message });
    await createSyncLog({
      entity: "connections_create",
      direction: "shopify->alegra",
      status: "fail",
      message,
    });
  }
}

export async function removeConnection(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "ID invalido" });
      return;
    }
    await deleteStoreConnection(id);
    const list = await listStoreConnections();
    res.status(200).json(list);
    await createSyncLog({
      entity: "connections_delete",
      direction: "shopify->alegra",
      status: "success",
      message: "Conexion eliminada",
      request: { id },
    });
  } catch (error) {
    const message = getErrorMessage(error);
    res.status(400).json({ error: message });
    await createSyncLog({
      entity: "connections_delete",
      direction: "shopify->alegra",
      status: "fail",
      message,
    });
  }
}
