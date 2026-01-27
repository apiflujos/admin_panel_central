import type { Request, Response } from "express";
import { listOperations, syncOperation, retryInvoiceFromLog, seedOperations } from "../services/operations.service";
import { createSyncLog } from "../services/logs.service";
import { getOrderInvoiceOverride, upsertOrderInvoiceOverride } from "../services/order-invoice-overrides.service";
import { ensureInvoiceSettingsColumns, getPool, getOrgId } from "../db";

const safeCreateLog = async (payload: Parameters<typeof createSyncLog>[0]) => {
  try {
    await createSyncLog(payload);
  } catch {
    // ignore logging failures
  }
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "No disponible";

export async function listOperationsHandler(req: Request, res: Response) {
  try {
    const days = req.query.days ? Number(req.query.days) : 7;
    const result = await listOperations(Number.isFinite(days) ? days : 7);
    res.status(200).json(result);
  } catch (error) {
    const message = getErrorMessage(error);
    res.status(400).json({ error: message });
    await safeCreateLog({
      entity: "operations_list",
      direction: "shopify->alegra",
      status: "fail",
      message,
      request: { days: req.query.days },
    });
  }
}

export async function syncOperationHandler(req: Request, res: Response) {
  try {
    const orderId = req.params.orderId;
    const result = await syncOperation(orderId);
    res.status(200).json(result);
    await safeCreateLog({
      entity: "operation_sync",
      direction: "shopify->alegra",
      status: "success",
      message: "Operacion sincronizada",
      request: { orderId },
      response: result as Record<string, unknown>,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    res.status(400).json({ error: message });
    await safeCreateLog({
      entity: "operation_sync",
      direction: "shopify->alegra",
      status: "fail",
      message,
      request: { orderId: req.params.orderId },
    });
  }
}

export async function retryInvoiceHandler(req: Request, res: Response) {
  try {
    const orderId = req.params.orderId;
    const result = await retryInvoiceFromLog(orderId);
    res.status(200).json(result);
    await safeCreateLog({
      entity: "invoice_retry",
      direction: "shopify->alegra",
      status: "success",
      message: "Reintento de factura ok",
      request: { orderId },
      response: result as Record<string, unknown>,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    res.status(400).json({ error: message });
    await safeCreateLog({
      entity: "invoice_retry",
      direction: "shopify->alegra",
      status: "fail",
      message,
      request: { orderId: req.params.orderId },
    });
  }
}

export async function seedOperationsHandler(_req: Request, res: Response) {
  try {
    const result = await seedOperations();
    res.status(200).json(result);
    await safeCreateLog({
      entity: "operations_seed",
      direction: "shopify->alegra",
      status: "success",
      message: "Seed operaciones ok",
      response: result as Record<string, unknown>,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    res.status(400).json({ error: message });
    await safeCreateLog({
      entity: "operations_seed",
      direction: "shopify->alegra",
      status: "fail",
      message,
    });
  }
}

export async function getEinvoiceOverrideHandler(req: Request, res: Response) {
  try {
    const orderId = req.params.orderId;
    const override = await getOrderInvoiceOverride(orderId);
    const pool = getPool();
    const orgId = getOrgId();
    await ensureInvoiceSettingsColumns(pool);
    const result = await pool.query<{ einvoice_enabled: boolean | null }>(
      `
      SELECT einvoice_enabled
      FROM invoice_settings
      WHERE organization_id = $1
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [orgId]
    );
    const einvoiceEnabled = Boolean(result.rows[0]?.einvoice_enabled);
    res.status(200).json({ override, einvoiceEnabled });
  } catch (error) {
    const message = getErrorMessage(error);
    res.status(400).json({ error: message });
  }
}

export async function saveEinvoiceOverrideHandler(req: Request, res: Response) {
  try {
    const orderId = req.params.orderId;
    const payload = req.body || {};
    const result = await upsertOrderInvoiceOverride(orderId, {
      orderId,
      einvoiceRequested: Boolean(payload.einvoiceRequested),
      idType: payload.idType,
      idNumber: payload.idNumber,
      fiscalName: payload.fiscalName,
      email: payload.email,
      phone: payload.phone,
      address: payload.address,
      city: payload.city,
      state: payload.state,
      country: payload.country,
      zip: payload.zip,
    });
    res.status(200).json(result);
  } catch (error) {
    const message = getErrorMessage(error);
    res.status(400).json({ error: message });
  }
}
