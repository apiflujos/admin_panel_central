import { NextResponse } from "next/server";
import { z } from "zod";

import { setTenantModule } from "../../../../../../../src/sa/sa.admin.service";
import { routeHandler } from "../../../../../lib/route-handler";
import { requireRouteSuperAdmin } from "../../../../../lib/route-auth";

const TenantId = z.number().int().positive();

function parseBooleanLike(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on", "si", "sí"].includes(normalized)) return true;
    if (["0", "false", "no", "off"].includes(normalized)) return false;
  }
  return value;
}

const booleanLikeSchema = z.preprocess(parseBooleanLike, z.boolean());

export const POST = routeHandler(async (req: Request) => {
  await requireRouteSuperAdmin();
  const schema = z.object({
    tenantId: TenantId,
    moduleKey: z.string().min(1),
    enabled: booleanLikeSchema,
  });
  try {
    const body = schema.parse((await req.json()) as Record<string, unknown>);
    const result = await setTenantModule(body.tenantId, body.moduleKey, body.enabled);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "invalid_request" }, { status: 400 });
  }
});
