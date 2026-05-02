import { NextResponse } from "next/server";

import { syncSingleContact } from "../../../../../../src/services/contacts-sync.service";
import { routeHandler } from "../../../../lib/route-handler";

export const POST = routeHandler(async (req: Request) => {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const { source, identifier, shopDomain } = body;
    if (!source || !identifier) {
      return NextResponse.json({ error: "missing_params" }, { status: 400 });
    }
    const result = await syncSingleContact({
      source: source === "alegra" ? "alegra" : "shopify",
      identifier: String(identifier),
      shopDomain: shopDomain ? String(shopDomain) : undefined,
      force: true,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = (error as { message?: string })?.message || "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
