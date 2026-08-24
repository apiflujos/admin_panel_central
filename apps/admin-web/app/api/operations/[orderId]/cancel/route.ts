import { NextResponse } from "next/server";

import { createSyncLog } from "../../../../../../../src/services/logs.service";
import { voidInvoiceForOrder } from "../../../../../../../src/services/operations-actions.service";
import { routeHandler } from "../../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../../lib/route-auth";

const safeCreateLog = async (payload: Parameters<typeof createSyncLog>[0]) => {
  try {
    await createSyncLog(payload);
  } catch {
    /* ignore log failures */
  }
};

export const POST = routeHandler(async (req: Request, ctx) => {
  await requireRouteAdmin();
  const params = (await (ctx.params ?? Promise.resolve({}))) as Record<string, string>;
  const orderId = String(params.orderId || "");
  const shopDomain = new URL(req.url).searchParams.get("shopDomain")?.trim() || undefined;
  try {
    const result = await voidInvoiceForOrder(orderId, shopDomain);
    const completed = new Set(["voided", "already_voided"]);
    if (!completed.has(result.status)) {
      await safeCreateLog({
        entity: "void_invoice",
        direction: "shopify->alegra",
        status: "fail",
        message: `Factura no anulada: ${result.status}`,
        request: { orderId, shopDomain },
        response: result as Record<string, unknown>,
      });
      return NextResponse.json(result, { status: 409 });
    }
    await safeCreateLog({
      entity: "void_invoice",
      direction: "shopify->alegra",
      status: "success",
      message: "Factura anulada",
      request: { orderId, shopDomain },
      response: result as Record<string, unknown>,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No disponible";
    await safeCreateLog({
      entity: "void_invoice",
      direction: "shopify->alegra",
      status: "fail",
      message,
      request: { orderId, shopDomain },
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
