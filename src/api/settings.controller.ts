import type { Request, Response } from "express";
import { validateConnections } from "../services/connectivity.service";
import { createSyncLog } from "../services/logs.service";
import {
  getSettings as getSettingsService,
  listAlegraCatalogItems,
  listInvoiceResolutions,
  saveSettings,
} from "../services/settings.service";

const safeCreateLog = async (payload: Parameters<typeof createSyncLog>[0]) => {
  try {
    await createSyncLog(payload);
  } catch {
    // ignore logging failures
  }
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "No disponible";

const summarizeSettingsPayload = (payload: Record<string, unknown>) => ({
  hasShopify: Boolean((payload.shopify as Record<string, unknown> | undefined)?.accessToken),
  hasAlegra: Boolean((payload.alegra as Record<string, unknown> | undefined)?.apiKey),
  hasAi: Boolean((payload.ai as Record<string, unknown> | undefined)?.apiKey),
  hasRules: Boolean(payload.rules),
  hasInvoice: Boolean(payload.invoice),
  hasTaxRules: Boolean(payload.taxRules),
  hasPaymentMappings: Boolean(payload.paymentMappings),
});

export async function testConnections(req: Request, res: Response) {
  try {
    const result = await validateConnections(req.body || {});
    res.status(200).json(result);
    await safeCreateLog({
      entity: "connections_test",
      direction: "shopify->alegra",
      status: "success",
      message: "Conexiones probadas",
      request: summarizeSettingsPayload(req.body || {}),
      response: result as Record<string, unknown>,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    res.status(400).json({ error: message });
    await safeCreateLog({
      entity: "connections_test",
      direction: "shopify->alegra",
      status: "fail",
      message,
      request: summarizeSettingsPayload(req.body || {}),
    });
  }
}

export async function updateSettings(req: Request, res: Response) {
  try {
    const result = await saveSettings(req.body || {});
    res.status(200).json(result);
    await safeCreateLog({
      entity: "settings_update",
      direction: "shopify->alegra",
      status: "success",
      message: "Settings guardados",
      request: summarizeSettingsPayload(req.body || {}),
      response: result as Record<string, unknown>,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    res.status(400).json({ error: message });
    await safeCreateLog({
      entity: "settings_update",
      direction: "shopify->alegra",
      status: "fail",
      message,
      request: summarizeSettingsPayload(req.body || {}),
    });
  }
}

export async function getSettings(_req: Request, res: Response) {
  try {
    const result = await getSettingsService();
    res.status(200).json(result);
    await safeCreateLog({
      entity: "settings_get",
      direction: "shopify->alegra",
      status: "success",
      message: "Settings cargados",
      response: result as Record<string, unknown>,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    res.status(400).json({ error: message });
    await safeCreateLog({
      entity: "settings_get",
      direction: "shopify->alegra",
      status: "fail",
      message,
    });
  }
}

export async function listResolutions(req: Request, res: Response) {
  try {
    const accountId = req.query.accountId ? Number(req.query.accountId) : undefined;
    const result = await listInvoiceResolutions(
      Number.isFinite(accountId as number) ? (accountId as number) : undefined
    );
    res.status(200).json(result);
    await safeCreateLog({
      entity: "resolutions_list",
      direction: "alegra->shopify",
      status: "success",
      message: "Resoluciones cargadas",
      response: result as Record<string, unknown>,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    res.status(400).json({ error: message });
    await safeCreateLog({
      entity: "resolutions_list",
      direction: "alegra->shopify",
      status: "fail",
      message,
    });
  }
}

export async function listAlegraCatalog(req: Request, res: Response) {
  try {
    const catalog = req.params.catalog;
    const accountId = req.query.accountId ? Number(req.query.accountId) : undefined;
    const shopDomain =
      typeof req.query.shopDomain === "string" ? req.query.shopDomain.trim() : undefined;
    const result = await listAlegraCatalogItems(
      catalog,
      Number.isFinite(accountId as number) ? (accountId as number) : undefined,
      shopDomain
    );
    res.status(200).json(result);
    await safeCreateLog({
      entity: "alegra_catalog",
      direction: "alegra->shopify",
      status: "success",
      message: "Catalogo cargado",
      request: { catalog },
      response: result as Record<string, unknown>,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    res.status(400).json({ error: message });
    await safeCreateLog({
      entity: "alegra_catalog",
      direction: "alegra->shopify",
      status: "fail",
      message,
      request: { catalog: req.params.catalog },
    });
  }
}
