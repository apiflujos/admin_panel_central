import { NextResponse } from "next/server";

import { listConnectionTests } from "../../../../../../src/services/connection-tests.service";
import { routeHandler } from "../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../lib/route-auth";

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "No disponible");

export const GET = routeHandler(async () => {
  await requireRouteAdmin();
  try {
    const result = await listConnectionTests();
    return NextResponse.json({ items: result });
  } catch (error) {
    const message = getErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
