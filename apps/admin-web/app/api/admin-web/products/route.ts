import { NextResponse } from "next/server";

import {
  normalizeProductsListFilters,
  toAdminWebProductsListDto,
} from "../../../../../../packages/domain/src/products";
import { listProducts } from "../../../../../../src/services/products.service";
import { routeHandler } from "../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../lib/route-auth";

export const GET = routeHandler(async (req: Request) => {
  await requireRouteAdmin();

  const searchParams = new URL(req.url).searchParams;
  const result = await listProducts(
    normalizeProductsListFilters({
      start: searchParams.get("start") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      query: searchParams.get("query") ?? undefined,
      shopDomain: searchParams.get("shopDomain") ?? undefined,
      inStockOnly: searchParams.get("inStockOnly") ?? undefined,
      warehouseIds: searchParams.get("warehouseIds") ?? undefined,
    })
  );

  return NextResponse.json(toAdminWebProductsListDto(result));
});
