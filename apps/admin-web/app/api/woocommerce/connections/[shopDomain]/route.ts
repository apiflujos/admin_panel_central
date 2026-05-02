import { NextResponse } from "next/server";

import { createSyncLog } from "../../../../../../../src/services/logs.service";
import { deleteWooConnectionByDomain, listWooConnections } from "../../../../../../../src/services/woocommerce-connections.service";
import { routeHandler } from "../../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../../lib/route-auth";

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "No disponible");

export const DELETE = routeHandler(async (_req: Request, ctx) => {
  await requireRouteAdmin();
  try {
    const params = (await (ctx.params ?? Promise.resolve({}))) as Record<string, string>;
    const normalizedShopDomain = String(params.shopDomain || "").trim();
    if (!normalizedShopDomain) {
      return NextResponse.json({ error: "Dominio invalido" }, { status: 400 });
    }
    const result = await deleteWooConnectionByDomain(normalizedShopDomain);
    const list = await listWooConnections();
    await createSyncLog({
      entity: "woocommerce_connections_delete",
      direction: "woocommerce->alegra",
      status: "success",
      message: result.deleted ? "Conexion WooCommerce eliminada" : "Conexion WooCommerce no encontrada",
      request: { shopDomain: normalizedShopDomain },
    });
    return NextResponse.json({ ...list, ...result });
  } catch (error) {
    const message = getErrorMessage(error);
    await createSyncLog({
      entity: "woocommerce_connections_delete",
      direction: "woocommerce->alegra",
      status: "fail",
      message,
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
