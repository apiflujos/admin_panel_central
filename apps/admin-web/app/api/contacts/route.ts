import { NextResponse } from "next/server";

import { normalizeContactsListFilters } from "../../../../../packages/domain/src/contacts";
import { listContacts } from "../../../../../src/services/contacts.service";
import { routeHandler } from "../../../lib/route-handler";
import { requireRouteAdmin } from "../../../lib/route-auth";

export const GET = routeHandler(async (req: Request) => {
  await requireRouteAdmin();
  const searchParams = new URL(req.url).searchParams;
  const query = Object.fromEntries(searchParams.entries());
  const result = await listContacts(normalizeContactsListFilters(query));
  return NextResponse.json(result);
});
