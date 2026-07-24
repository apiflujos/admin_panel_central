import { NextResponse } from "next/server";

import { createSyncLog } from "../../../../../../../src/services/logs.service";
import { syncOperation } from "../../../../../../../src/services/operations.service";
import { upsertOrderInvoiceOverride } from "../../../../../../../src/services/order-invoice-overrides.service";
import { routeHandler } from "../../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../../lib/route-auth";

const safeCreateLog = async (payload: Parameters<typeof createSyncLog>[0]) => {
  try {
    await createSyncLog(payload);
  } catch {
    /* ignore log failures */
  }
};

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "No disponible");

// Facturación manual por pedido "a discreción". Reconstruye el payload desde
// Shopify (funciona para pedidos "pendiente" que nunca se facturaron).
// body.electronic = true → factura electrónica (requiere datos fiscales DIAN).
export const POST = routeHandler(async (req: Request, ctx) => {
  await requireRouteAdmin();
  const params = (await (ctx.params ?? Promise.resolve({}))) as Record<string, string>;
  const orderId = String(params.orderId || "");
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const electronic = Boolean(body.electronic);
  try {
    if (electronic) {
      await upsertOrderInvoiceOverride(orderId, {
        orderId,
        einvoiceRequested: true,
        idType: body.idType as string | undefined,
        idNumber: body.idNumber as string | undefined,
        fiscalName: body.fiscalName as string | undefined,
        email: body.email as string | undefined,
        phone: body.phone as string | undefined,
        address: body.address as string | undefined,
        city: body.city as string | undefined,
        state: body.state as string | undefined,
        country: body.country as string | undefined,
        zip: body.zip as string | undefined,
      });
    }
    const result = await syncOperation(orderId, { generateInvoice: true, forceEinvoice: electronic });
    const inner = (result as { result?: { reason?: string; missing?: string[] } }).result;
    if (inner?.reason === "missing_einvoice_data") {
      await safeCreateLog({
        entity: "invoice_manual",
        direction: "shopify->alegra",
        status: "warn",
        message: "Faltan datos de factura electrónica",
        request: { orderId },
      });
      return NextResponse.json({ error: "missing_einvoice_data", missing: inner.missing || [] }, { status: 422 });
    }
    await safeCreateLog({
      entity: "invoice_manual",
      direction: "shopify->alegra",
      status: "success",
      message: electronic ? "Factura electrónica generada (manual)" : "Factura generada (manual)",
      request: { orderId, electronic },
      response: result as Record<string, unknown>,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = getErrorMessage(error);
    await safeCreateLog({
      entity: "invoice_manual",
      direction: "shopify->alegra",
      status: "fail",
      message,
      request: { orderId },
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
