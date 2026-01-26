import type { Request, Response } from "express";
import { emitPaymentForOrder, voidInvoiceForOrder } from "../services/operations-actions.service";
import { createSyncLog } from "../services/logs.service";

const safeCreateLog = async (payload: Parameters<typeof createSyncLog>[0]) => {
  try {
    await createSyncLog(payload);
  } catch {
    // ignore logging failures
  }
};

export async function emitPaymentHandler(req: Request, res: Response) {
  try {
    const orderId = req.params.orderId;
    const result = await emitPaymentForOrder(orderId);
    res.status(200).json(result);
    await safeCreateLog({
      entity: "emit_payment",
      direction: "shopify->alegra",
      status: "success",
      message: "Pago emitido",
      request: { orderId },
      response: result as Record<string, unknown>,
    });
  } catch (error) {
    res.status(400).json({ error: error.message || "No disponible" });
    await safeCreateLog({
      entity: "emit_payment",
      direction: "shopify->alegra",
      status: "fail",
      message: error.message || "No disponible",
      request: { orderId: req.params.orderId },
    });
  }
}

export async function voidInvoiceHandler(req: Request, res: Response) {
  try {
    const orderId = req.params.orderId;
    const result = await voidInvoiceForOrder(orderId);
    res.status(200).json(result);
    await safeCreateLog({
      entity: "void_invoice",
      direction: "shopify->alegra",
      status: "success",
      message: "Factura anulada",
      request: { orderId },
      response: result as Record<string, unknown>,
    });
  } catch (error) {
    res.status(400).json({ error: error.message || "No disponible" });
    await safeCreateLog({
      entity: "void_invoice",
      direction: "shopify->alegra",
      status: "fail",
      message: error.message || "No disponible",
      request: { orderId: req.params.orderId },
    });
  }
}
