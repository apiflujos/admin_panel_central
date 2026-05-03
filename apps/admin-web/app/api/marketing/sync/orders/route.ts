import { NextResponse } from "next/server";
import { z } from "zod";

import { syncMarketingOrders } from "../../../../../../../src/marketing/sync/marketing-sync.service";
import { routeHandler } from "../../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../../lib/route-auth";

const schema = z.object({
  shopDomain: z.string().min(3),
  sinceDate: z.string().optional(),
  maxOrders: z.number().int().positive().optional(),
});

export const POST = routeHandler(async (req: Request) => {
  await requireRouteAdmin();
  try {
    const body = schema.parse((await req.json()) as Record<string, unknown>);
    const result = await syncMarketingOrders(body.shopDomain, {
      sinceDate: body.sinceDate,
      maxOrders: body.maxOrders,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "sync_error" }, { status: 400 });
  }
});
