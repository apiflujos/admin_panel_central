import { NextResponse } from "next/server";

import { createSyncLog } from "../../../../../../src/services/logs.service";
import { deleteStoreById, listStores } from "../../../../../../src/services/stores.service";
import { deleteWooConnectionsByStoreId } from "../../../../../../src/services/woocommerce-connections.service";
import { routeHandler } from "../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../lib/route-auth";

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "No disponible");

export const DELETE = routeHandler(async (_req: Request, ctx) => {
  await requireRouteAdmin();
  try {
    const params = (await (ctx.params ?? Promise.resolve({}))) as Record<string, string>;
    const storeId = Number(params.id || "");
    if (!Number.isFinite(storeId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }
    await deleteWooConnectionsByStoreId(storeId).catch(() => ({ deleted: false }));
    await deleteStoreById(storeId);
    const result = await listStores();
    await createSyncLog({
      entity: "stores_delete",
      direction: "shopify->alegra",
      status: "success",
      message: "Tienda eliminada",
      request: { storeId },
      response: result as Record<string, unknown>,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = getErrorMessage(error);
    await createSyncLog({
      entity: "stores_delete",
      direction: "shopify->alegra",
      status: "fail",
      message,
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
