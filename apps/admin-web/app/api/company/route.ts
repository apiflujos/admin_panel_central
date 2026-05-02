import { NextResponse } from "next/server";

import { getCompanyProfile, saveCompanyProfile } from "../../../../../src/services/company.service";
import { routeHandler } from "../../../lib/route-handler";
import { requireRouteAdmin } from "../../../lib/route-auth";

export const GET = routeHandler(async () => {
  await requireRouteAdmin();
  try {
    const company = await getCompanyProfile();
    return NextResponse.json(company);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No disponible";
    return NextResponse.json({ error: message }, { status: 400 });
  }
});

export const PUT = routeHandler(async (req: Request) => {
  await requireRouteAdmin();
  try {
    const company = await saveCompanyProfile((await req.json()) as Record<string, unknown>);
    return NextResponse.json(company);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No disponible";
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
