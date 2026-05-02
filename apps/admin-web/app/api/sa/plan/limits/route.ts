import { NextResponse } from "next/server";
import { z } from "zod";

import { getPool } from "../../../../../../../src/db";
import { routeHandler } from "../../../../../lib/route-handler";
import { requireRouteSuperAdmin } from "../../../../../lib/route-auth";

const ServiceKey = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9_]+$/i);
const PlanKey = z
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

export const GET = routeHandler(async (req: Request) => {
  await requireRouteSuperAdmin();
  try {
    const planKey = PlanKey.parse(String(new URL(req.url).searchParams.get("planKey") || ""));
    const pool = getPool();
    const plan = await pool.query<{ id: string; key: string; plan_type: string }>(
      `
      SELECT id::text AS id, key, plan_type
      FROM sa.plan_definitions
      WHERE key = $1
      LIMIT 1
      `,
      [planKey]
    );
    const planId = plan.rows[0]?.id;
    if (!planId) {
      return NextResponse.json({ error: "Plan no encontrado." }, { status: 404 });
    }
    const rows = await pool.query<{
      service_key: string;
      service_name: string;
      period_type: string;
      active: boolean;
      is_unlimited: boolean | null;
      max_value: string | null;
      unit_price: string | null;
    }>(
      `
      SELECT
        ld.key AS service_key,
        ld.name AS service_name,
        ld.period_type,
        ld.active,
        psl.is_unlimited,
        psl.max_value::text AS max_value,
        psl.unit_price::text AS unit_price
      FROM sa.limit_definitions ld
      LEFT JOIN sa.plan_service_limits psl
        ON psl.service_key = ld.key AND psl.plan_id = $1
      ORDER BY ld.key ASC
      `,
      [planId]
    );
    return NextResponse.json({
      planKey,
      planType: plan.rows[0]?.plan_type || null,
      items: rows.rows.map((r) => ({
        serviceKey: r.service_key,
        serviceName: r.service_name,
        periodType: r.period_type === "total" ? "total" : "monthly",
        active: Boolean(r.active),
        isUnlimited: r.is_unlimited === null ? null : Boolean(r.is_unlimited),
        maxValue: r.max_value === null ? null : Number(r.max_value),
        unitPrice: r.unit_price === null ? 0 : Number(r.unit_price),
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "invalid_request" }, { status: 400 });
  }
});

export const POST = routeHandler(async (req: Request) => {
  await requireRouteSuperAdmin();
  const schema = z.object({
    planKey: PlanKey,
    serviceKey: ServiceKey,
    isUnlimited: booleanLikeSchema.optional(),
    maxValue: z.number().nullable().optional(),
    unitPrice: z.number().optional(),
  });
  try {
    const body = schema.parse((await req.json()) as Record<string, unknown>);
    const pool = getPool();
    const plan = await pool.query<{ id: string }>(
      `
      SELECT id::text AS id
      FROM sa.plan_definitions
      WHERE key = $1
      LIMIT 1
      `,
      [body.planKey]
    );
    const planId = plan.rows[0]?.id;
    if (!planId) {
      return NextResponse.json({ error: "Plan no encontrado." }, { status: 404 });
    }
    await pool.query(
      `
      INSERT INTO sa.plan_service_limits (plan_id, service_key, is_unlimited, max_value, unit_price, updated_at)
      VALUES ($1,$2,$3,$4,$5,NOW())
      ON CONFLICT (plan_id, service_key)
      DO UPDATE SET is_unlimited = EXCLUDED.is_unlimited,
                    max_value = EXCLUDED.max_value,
                    unit_price = EXCLUDED.unit_price,
                    updated_at = NOW()
      `,
      [
        planId,
        body.serviceKey,
        Boolean(body.isUnlimited),
        body.maxValue === undefined ? null : body.maxValue,
        Number.isFinite(body.unitPrice as number) ? Number(body.unitPrice) : 0,
      ]
    );
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "invalid_request" }, { status: 400 });
  }
});
