import type { Request, Response } from "express";
import { getOrgId } from "../db";
import { isTenantModuleEnabled } from "../sa/sa.repository";
import { createSyncLog } from "../services/logs.service";
import {
  deleteStoreConnection,
  deleteStoreConnectionByDomain,
  listStoreConnections,
  upsertStoreConnection,
} from "../services/store-connections.service";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "No disponible";

const moduleError = (moduleKey: string) => {
  const err = new Error(`Modulo ${moduleKey} desactivado por ApiFlujos.`);
  (err as { statusCode?: number }).statusCode = 403;
  return err;
};

async function assertModuleEnabled(moduleKey: string) {
  const enabled = await isTenantModuleEnabled(getOrgId(), moduleKey);
  if (!enabled) {
    throw moduleError(moduleKey);
  }
}

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
    if (payload?.shopify?.shopDomain || payload?.shopify?.accessToken) {
      await assertModuleEnabled("shopify");
    }
    if (payload?.alegra) {
      await assertModuleEnabled("alegra");
    }
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
    const status = (error as { statusCode?: number }).statusCode || 400;
    res.status(status).json({ error: message });
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
    const purgeDataRaw = String(req.query?.purgeData || req.query?.purge || "").trim().toLowerCase();
    const purgeData = purgeDataRaw === "1" || purgeDataRaw === "true" || purgeDataRaw === "yes";
    await deleteStoreConnection(id, { purgeData });
    const list = await listStoreConnections();
    res.status(200).json(list);
    await createSyncLog({
      entity: "connections_delete",
      direction: "shopify->alegra",
      status: "success",
      message: "Conexion eliminada",
      request: { id, purgeData },
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

export async function removeConnectionByDomain(req: Request, res: Response) {
  try {
    const shopDomain = String(req.params.shopDomain || "").trim();
    if (!shopDomain) {
      res.status(400).json({ error: "Dominio invalido" });
      return;
    }
    const purgeDataRaw = String(req.query?.purgeData || req.query?.purge || "").trim().toLowerCase();
    const purgeData = purgeDataRaw === "1" || purgeDataRaw === "true" || purgeDataRaw === "yes";
    const result = await deleteStoreConnectionByDomain(shopDomain, { purgeData });
    const list = await listStoreConnections();
    res.status(200).json({ ...list, ...result });
    await createSyncLog({
      entity: "connections_delete",
      direction: "shopify->alegra",
      status: "success",
      message: result.deleted ? "Conexion eliminada" : "Conexion no encontrada",
      request: { shopDomain, purgeData },
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
