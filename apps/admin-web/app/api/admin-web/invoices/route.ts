import { NextResponse } from "next/server";

import {
  normalizeInvoicesListFilters,
  toAdminWebInvoicesListDto,
} from "../../../../../../packages/domain/src/invoices";
import { listInvoices } from "../../../../../../src/services/invoices.service";
import { routeHandler } from "../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../lib/route-auth";

export const GET = routeHandler(async (req: Request) => {
  await requireRouteAdmin();

  const searchParams = new URL(req.url).searchParams;
  const result = await listInvoices(
    normalizeInvoicesListFilters({
      shopDomain: searchParams.get("shopDomain") ?? undefined,
      query: searchParams.get("query") ?? undefined,
      date: searchParams.get("date") ?? undefined,
      days: searchParams.get("days") ?? undefined,
      sort: searchParams.get("sort") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    })
  );

  return NextResponse.json(toAdminWebInvoicesListDto(result));
});
