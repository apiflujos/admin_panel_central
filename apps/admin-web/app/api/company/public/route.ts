import { NextResponse } from "next/server";

import { getCompanyProfile } from "../../../../../../src/services/company.service";
import { routeHandler } from "../../../../lib/route-handler";

export const GET = routeHandler(async () => {
  try {
    const company = await getCompanyProfile();
    return NextResponse.json({
      name: company.name,
      logoBase64: company.logoBase64,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No disponible";
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
