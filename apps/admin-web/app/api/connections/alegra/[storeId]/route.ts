import { NextResponse } from "next/server";

import { createSyncLog } from "../../../../../../../src/services/logs.service";
import {
  deleteAlegraAccountByStoreId,
  listStoreConnections,
} from "../../../../../../../src/services/store-connections.service";
import { routeHandler } from "../../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../../lib/route-auth";

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "No disponible");

export const DELETE = routeHandler(async (_req: Request, ctx) => {
  await requireRouteAdmin();
  try {
    const params = (await (ctx.params ?? Promise.resolve({}))) as Record<string, string>;
    const numericStoreId = Number(params.storeId || "");
    if (!Number.isFinite(numericStoreId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }
    const result = await deleteAlegraAccountByStoreId(numericStoreId);
    const list = await listStoreConnections();
    await createSyncLog({
      entity: "connections_delete",
      direction: "shopify->alegra",
      status: "success",
      message: result.deleted ? "Alegra desconectado" : "Alegra no encontrado",
      request: { storeId: numericStoreId },
    });
    return NextResponse.json({ ...list, ...result });
  } catch (error) {
    const message = getErrorMessage(error);
    await createSyncLog({
      entity: "connections_delete",
      direction: "shopify->alegra",
      status: "fail",
      message,
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
