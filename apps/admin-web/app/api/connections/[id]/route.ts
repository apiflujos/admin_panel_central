import { NextResponse } from "next/server";

import { createSyncLog } from "../../../../../../src/services/logs.service";
import { deleteStoreConnection, listStoreConnections } from "../../../../../../src/services/store-connections.service";
import { routeHandler } from "../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../lib/route-auth";

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "No disponible");

export const DELETE = routeHandler(async (req: Request, ctx) => {
  await requireRouteAdmin();
  try {
    const params = (await (ctx.params ?? Promise.resolve({}))) as Record<string, string>;
    const storeId = Number(params.id || "");
    if (!Number.isFinite(storeId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }
    const searchParams = new URL(req.url).searchParams;
    const purgeDataRaw = String(searchParams.get("purgeData") || searchParams.get("purge") || "")
      .trim()
      .toLowerCase();
    const purgeData = purgeDataRaw === "1" || purgeDataRaw === "true" || purgeDataRaw === "yes";
    await deleteStoreConnection(storeId, { purgeData });
    const list = await listStoreConnections();
    await createSyncLog({
      entity: "connections_delete",
      direction: "shopify->alegra",
      status: "success",
      message: "Conexion eliminada",
      request: { id: storeId, purgeData },
    });
    return NextResponse.json(list);
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
