import { NextResponse } from "next/server";

import { toAuthSessionDto } from "../../../../../../packages/domain/src/auth";
import { routeHandler } from "../../../../lib/route-handler";
import { requireRouteUser } from "../../../../lib/route-auth";

export const GET = routeHandler(async () => {
  const user = await requireRouteUser();
  return NextResponse.json(toAuthSessionDto(user));
});
