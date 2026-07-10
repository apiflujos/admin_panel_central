import { NextResponse } from "next/server";

import { createSyncLog } from "../../../../../../../src/services/logs.service";
import { retryInvoiceFromLog } from "../../../../../../../src/services/operations.service";
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

export const POST = routeHandler(async (_req: Request, ctx) => {
  await requireRouteAdmin();
  const params = (await (ctx.params ?? Promise.resolve({}))) as Record<string, string>;
  const orderId = String(params.orderId || "");
  try {
    const result = await retryInvoiceFromLog(orderId);
    await safeCreateLog({
      entity: "invoice_retry",
      direction: "shopify->alegra",
      status: "success",
      message: "Reintento de factura ok",
      request: { orderId },
      response: result as Record<string, unknown>,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = getErrorMessage(error);
    await safeCreateLog({
      entity: "invoice_retry",
      direction: "shopify->alegra",
      status: "fail",
      message,
      request: { orderId },
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
