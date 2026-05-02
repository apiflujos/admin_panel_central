import { NextResponse } from "next/server";
import { z } from "zod";

import { getPool } from "../../../../../../src/db";
import { routeHandler } from "../../../../lib/route-handler";
import { requireRouteSuperAdmin } from "../../../../lib/route-auth";

const ServiceKey = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9_]+$/i);

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

export const GET = routeHandler(async () => {
  await requireRouteSuperAdmin();
  const pool = getPool();
  const rows = await pool.query<{
    key: string;
    name: string;
    period_type: string;
    active: boolean;
  }>(
    `
    SELECT key, name, period_type, active
    FROM sa.limit_definitions
    ORDER BY key ASC
    `
  );
  return NextResponse.json({
    items: rows.rows.map((r) => ({
      key: r.key,
      name: r.name,
      periodType: r.period_type === "total" ? "total" : "monthly",
      active: Boolean(r.active),
    })),
  });
});

export const POST = routeHandler(async (req: Request) => {
  await requireRouteSuperAdmin();
  const schema = z.object({
    key: ServiceKey,
    name: z.string().min(1).max(120),
    periodType: z.enum(["monthly", "total"]).default("monthly"),
    active: booleanLikeSchema.default(true),
  });
  try {
    const body = schema.parse((await req.json()) as Record<string, unknown>);
    const pool = getPool();
    await pool.query(
      `
      INSERT INTO sa.limit_definitions (key, name, period_type, active, updated_at)
      VALUES ($1,$2,$3,$4,NOW())
      ON CONFLICT (key) DO UPDATE
        SET name = EXCLUDED.name,
            period_type = EXCLUDED.period_type,
            active = EXCLUDED.active,
            updated_at = NOW()
      `,
      [body.key, body.name, body.periodType, body.active]
    );
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "invalid_request" }, { status: 400 });
  }
});
