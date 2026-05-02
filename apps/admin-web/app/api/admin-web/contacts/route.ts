import { NextResponse } from "next/server";

import {
  normalizeContactsListFilters,
  toAdminWebContactsListDto,
  type ContactsListServiceResult,
} from "../../../../../../packages/domain/src/contacts";
import { listContacts } from "../../../../../../src/services/contacts.service";
import { routeHandler } from "../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../lib/route-auth";

export const GET = routeHandler(async (req: Request) => {
  await requireRouteAdmin();

  const searchParams = new URL(req.url).searchParams;
  const filters = normalizeContactsListFilters({
    shopDomain: searchParams.get("shopDomain") ?? undefined,
    query: searchParams.get("query") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    source: searchParams.get("source") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    offset: searchParams.get("offset") ?? undefined,
  });
  const result = await listContacts(filters);

  return NextResponse.json(
    toAdminWebContactsListDto(result as ContactsListServiceResult)
  );
});
