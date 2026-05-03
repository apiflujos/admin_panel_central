import { NextResponse } from "next/server";

import { listAlegraCatalogItems } from "../../../../../../src/services/settings.service";
import { routeHandler } from "../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../lib/route-auth";

export const GET = routeHandler(async (_req: Request, ctx) => {
  await requireRouteAdmin();
  const params = await ctx.params;
  const catalog = String(params.catalog || "");
  const url = new URL(_req.url);
  const accountId = url.searchParams.get("accountId");
  const shopDomain = url.searchParams.get("shopDomain") || undefined;
  const result = await listAlegraCatalogItems(
    catalog,
    accountId ? Number(accountId) : undefined,
    shopDomain
  );
  if (result.error) {
    return NextResponse.json({ error: result.error, items: result.items || [] }, { status: 400 });
  }
  return NextResponse.json(result);
});
