import { NextResponse } from "next/server";

import { getOrgId, getPool } from "../../../../../../src/db";
import { listAlegraCatalogItems } from "../../../../../../src/services/settings.service";
import { routeHandler } from "../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../lib/route-auth";

async function assertAccountOwnership(accountId: number) {
  const pool = getPool();
  const orgId = getOrgId();
  const result = await pool.query<{ id: number }>(
    `
    SELECT id
    FROM alegra_accounts
    WHERE organization_id = $1 AND id = $2
    LIMIT 1
    `,
    [orgId, accountId]
  );
  if (!result.rows.length) {
    const err = new Error("Cuenta Alegra no pertenece a esta organización.");
    (err as { statusCode?: number }).statusCode = 403;
    throw err;
  }
}

export const GET = routeHandler(async (_req: Request, ctx) => {
  await requireRouteAdmin();
  const params = await ctx.params;
  const catalog = String(params.catalog || "");
  const url = new URL(_req.url);
  const accountIdRaw = url.searchParams.get("accountId");
  const accountId = accountIdRaw ? Number(accountIdRaw) : undefined;
  const shopDomain = url.searchParams.get("shopDomain") || undefined;
  if (accountId != null) {
    if (!Number.isFinite(accountId) || accountId <= 0) {
      return NextResponse.json({ error: "accountId inválido" }, { status: 400 });
    }
    await assertAccountOwnership(accountId);
  }
  const result = await listAlegraCatalogItems(catalog, accountId, shopDomain);
  if (result.error) {
    return NextResponse.json({ error: result.error, items: result.items || [] }, { status: 400 });
  }
  return NextResponse.json(result);
});
