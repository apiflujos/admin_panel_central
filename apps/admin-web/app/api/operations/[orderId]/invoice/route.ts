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

export const POST = routeHandler(async (req: Request, ctx) => {
  await requireRouteAdmin();
  const params = (await (ctx.params ?? Promise.resolve({}))) as Record<string, string>;
  const orderId = String(params.orderId || "");
  const shopDomain = new URL(req.url).searchParams.get("shopDomain")?.trim() || undefined;
  try {
    const result = await retryInvoiceFromLog(orderId, shopDomain);
    const completed = new Set(["created", "recovered", "already_invoiced", "already_completed"]);
    if (!completed.has(result.status)) {
      await safeCreateLog({
        entity: "invoice_retry",
        direction: "shopify->alegra",
        status: "fail",
        message: `Reintento no completado: ${result.status}`,
        request: { orderId, shopDomain },
        response: result as Record<string, unknown>,
      });
      return NextResponse.json(result, { status: 409 });
    }
    await safeCreateLog({
      entity: "invoice_retry",
      direction: "shopify->alegra",
      status: "success",
      message: "Reintento de factura ok",
      request: { orderId, shopDomain },
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
      request: { orderId, shopDomain },
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
