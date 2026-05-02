import { NextResponse } from "next/server";

import { createSyncLog } from "../../../../../../src/services/logs.service";
import { listAlegraCatalogItems } from "../../../../../../src/services/settings.service";
import { routeHandler } from "../../../../lib/route-handler";

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "No disponible");

const safeCreateLog = async (payload: Parameters<typeof createSyncLog>[0]) => {
  try {
    await createSyncLog(payload);
  } catch {
    // ignore logging failures
  }
};

export const GET = routeHandler(async (req: Request, ctx) => {
  const params = (await (ctx.params ?? Promise.resolve({}))) as Record<string, string>;
  const catalog = String(params.catalog || "");
  try {
    const searchParams = new URL(req.url).searchParams;
    const rawAccountId = searchParams.get("accountId");
    const accountId = rawAccountId ? Number(rawAccountId) : undefined;
    const shopDomain = searchParams.get("shopDomain")?.trim() || undefined;
    const result = await listAlegraCatalogItems(
      catalog,
      Number.isFinite(accountId as number) ? (accountId as number) : undefined,
      shopDomain
    );
    await safeCreateLog({
      entity: "alegra_catalog",
      direction: "alegra->shopify",
      status: "success",
      message: "Catalogo cargado",
      request: { catalog },
      response: result as Record<string, unknown>,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = getErrorMessage(error);
    await safeCreateLog({
      entity: "alegra_catalog",
      direction: "alegra->shopify",
      status: "fail",
      message,
      request: { catalog },
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
