import type { Request, Response } from "express";
import { createSyncLog } from "../services/logs.service";
import {
  deleteWooConnectionByDomain,
  listWooConnections,
  upsertWooConnection,
} from "../services/woocommerce-connections.service";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "No disponible";

export async function listWooConnectionsHandler(_req: Request, res: Response) {
  try {
    const result = await listWooConnections();
    res.status(200).json(result);
    await createSyncLog({
      entity: "woocommerce_connections_list",
      direction: "woocommerce->alegra",
      status: "success",
      message: "Conexiones WooCommerce cargadas",
      response: result as Record<string, unknown>,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    res.status(400).json({ error: message });
    await createSyncLog({
      entity: "woocommerce_connections_list",
      direction: "woocommerce->alegra",
      status: "fail",
      message,
    });
  }
}

export async function createWooConnectionHandler(req: Request, res: Response) {
  try {
    const payload = req.body || {};
    const result = await upsertWooConnection({
      storeName: payload?.storeName || "",
      shopDomain: payload?.woocommerce?.shopDomain || payload?.shopDomain || "",
      consumerKey: payload?.woocommerce?.consumerKey || payload?.consumerKey || "",
      consumerSecret: payload?.woocommerce?.consumerSecret || payload?.consumerSecret || "",
    });
    const list = await listWooConnections();
    res.status(200).json({ created: result, ...list });
    await createSyncLog({
      entity: "woocommerce_connections_create",
      direction: "woocommerce->alegra",
      status: "success",
      message: "Conexion WooCommerce creada",
      request: { shopDomain: payload?.woocommerce?.shopDomain || payload?.shopDomain },
      response: result as Record<string, unknown>,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    res.status(400).json({ error: message });
    await createSyncLog({
      entity: "woocommerce_connections_create",
      direction: "woocommerce->alegra",
      status: "fail",
      message,
    });
  }
}

export async function deleteWooConnectionHandler(req: Request, res: Response) {
  try {
    const shopDomain = String(req.params.shopDomain || "").trim();
    if (!shopDomain) {
      res.status(400).json({ error: "Dominio invalido" });
      return;
    }
    const result = await deleteWooConnectionByDomain(shopDomain);
    const list = await listWooConnections();
    res.status(200).json({ ...list, ...result });
    await createSyncLog({
      entity: "woocommerce_connections_delete",
      direction: "woocommerce->alegra",
      status: "success",
      message: result.deleted ? "Conexion WooCommerce eliminada" : "Conexion WooCommerce no encontrada",
      request: { shopDomain },
    });
  } catch (error) {
    const message = getErrorMessage(error);
    res.status(400).json({ error: message });
    await createSyncLog({
      entity: "woocommerce_connections_delete",
      direction: "woocommerce->alegra",
      status: "fail",
      message,
    });
  }
}
