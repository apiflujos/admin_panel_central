import { NextResponse } from "next/server";
import { z } from "zod";

import { normalizeMarketingDashboardFilters } from "../../../../../../packages/domain/src/marketing";
import { getOrgId, getPool } from "../../../../../../src/db";
import { routeHandler } from "../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../lib/route-auth";

const DateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const schema = z.object({
  shopDomain: z.string().min(3),
  date: DateKey,
  utmCampaign: z.string().min(1),
  amount: z.number().nonnegative(),
  currency: z.string().optional(),
});

export const POST = routeHandler(async (req: Request) => {
  await requireRouteAdmin();
  try {
    const body = schema.parse((await req.json()) as Record<string, unknown>);
    const pool = getPool();
    const orgId = getOrgId();
    const { shopDomain } = normalizeMarketingDashboardFilters({ shopDomain: body.shopDomain });
    await pool.query(
      `
      INSERT INTO marketing.campaign_spend (organization_id, shop_domain, date, utm_campaign, amount, currency, updated_at)
      VALUES ($1,$2,$3::date,$4,$5,$6,NOW())
      ON CONFLICT (organization_id, shop_domain, date, utm_campaign)
      DO UPDATE SET amount = EXCLUDED.amount,
                    currency = COALESCE(EXCLUDED.currency, marketing.campaign_spend.currency),
                    updated_at = NOW()
      `,
      [orgId, shopDomain, body.date, body.utmCampaign, body.amount, body.currency || null]
    );

    await pool.query(
      `
      INSERT INTO marketing.campaigns (organization_id, shop_domain, utm_source, utm_medium, utm_campaign, utm_content, name, updated_at)
      VALUES ($1,$2,'','',$3,'',$3,NOW())
      ON CONFLICT (organization_id, shop_domain, utm_campaign, utm_source, utm_medium, utm_content)
      DO UPDATE SET updated_at = NOW()
      `,
      [orgId, shopDomain, body.utmCampaign]
    );
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "spend_error" }, { status: 400 });
  }
});
