import { NextResponse } from "next/server";

import { normalizeInvoicesListFilters, toAdminWebInvoicesListDto } from "../../../../../packages/domain/src/invoices";
import { listInvoices } from "../../../../../src/services/invoices.service";
import { routeHandler } from "../../../lib/route-handler";
import { requireRouteAdmin } from "../../../lib/route-auth";

export const GET = routeHandler(async (req: Request) => {
  await requireRouteAdmin();
  const searchParams = new URL(req.url).searchParams;
  const query = Object.fromEntries(searchParams.entries());
  const result = await listInvoices(normalizeInvoicesListFilters(query));
  return NextResponse.json(toAdminWebInvoicesListDto(result));
});
