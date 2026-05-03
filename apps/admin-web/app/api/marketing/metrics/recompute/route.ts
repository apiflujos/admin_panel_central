import { NextResponse } from "next/server";
import { z } from "zod";

import { recomputeDailyMarketingMetrics } from "../../../../../../../src/marketing/metrics/marketing-metrics.service";
import { routeHandler } from "../../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../../lib/route-auth";

const DateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const schema = z.object({
  shopDomain: z.string().min(3),
  from: z.string().optional(),
  to: z.string().optional(),
});

function todayKeyUtc() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysUtc(dateKey: string, days: number) {
  const base = new Date(`${dateKey}T00:00:00.000Z`);
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export const POST = routeHandler(async (req: Request) => {
  await requireRouteAdmin();
  try {
    const body = schema.parse((await req.json()) as Record<string, unknown>);
    const to = body.to && DateKey.safeParse(body.to).success ? body.to : todayKeyUtc();
    const from = body.from && DateKey.safeParse(body.from).success ? body.from : addDaysUtc(to, -30);
    const result = await recomputeDailyMarketingMetrics({
      shopDomain: body.shopDomain,
      from,
      to,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "metrics_error" }, { status: 400 });
  }
});
