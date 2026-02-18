import { getPool } from "../db";
import { ensureServiceDefinition, getServiceDefinition, getTenantPlanSnapshot } from "./sa.repository";
import { monthKeyBogota } from "./sa.time";

export type ConsumeInput = {
  tenant_id: number;
  amount?: number;
  source?: string;
  meta?: Record<string, unknown>;
};

export type ConsumeResult = {
  tenant_id: number;
  service_key: string;
  period_key: string;
  prev_total: number;
  next_total: number;
  charged: boolean;
  charged_quantity: number;
  unit_price: number;
  charged_total: number;
};

function clampAmount(value: unknown) {
  const num = Number(value ?? 1);
  if (!Number.isFinite(num) || num <= 0) return 1;
  return num;
}

export async function consumeLimitOrBlock(serviceKey: string, input: ConsumeInput): Promise<ConsumeResult> {
  const pool = getPool();
  const tenantId = Number(input.tenant_id);
  if (!Number.isInteger(tenantId) || tenantId <= 0) throw new Error("tenant_id inválido");
  const key = String(serviceKey || "").trim();
  if (!key) throw new Error("serviceKey requerido");
  const amount = clampAmount(input.amount);
  const source = input.source ? String(input.source).trim() : null;
  const meta = input.meta && typeof input.meta === "object" ? input.meta : {};

  await ensureServiceDefinition(key);
  const svc = await getServiceDefinition(key);
  const periodType = svc?.periodType === "total" ? "total" : "monthly";
  const periodKey = periodType === "total" ? "total" : monthKeyBogota();

  const snapshot = await getTenantPlanSnapshot(tenantId);
  const planSvc = snapshot.services[key] || null;
  const planType = snapshot.planType;
  const unitPrice = planSvc ? Number(planSvc.unitPrice || 0) : 0;
  const maxValue =
    planType === "pro" && planSvc && planSvc.isUnlimited === false && planSvc.maxValue !== null
      ? Number(planSvc.maxValue)
      : null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const counterRes = await client.query<{ total: string }>(
      `
      SELECT total::text AS total
      FROM sa.usage_counters
      WHERE tenant_id = $1 AND service_key = $2 AND period_key = $3
      LIMIT 1
      `,
      [tenantId, key, periodKey]
    );
    const prevTotal = Number(counterRes.rows[0]?.total || 0);
    const nextTotal = prevTotal + amount;

    await client.query(
      `
      INSERT INTO sa.usage_events (tenant_id, service_key, amount, period_key, source, meta, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,NOW())
      `,
      [tenantId, key, amount, periodKey, source, meta]
    );

    await client.query(
      `
      INSERT INTO sa.usage_counters (tenant_id, service_key, period_key, total, updated_at)
      VALUES ($1,$2,$3,$4,NOW())
      ON CONFLICT (tenant_id, service_key, period_key)
      DO UPDATE SET total = sa.usage_counters.total + EXCLUDED.total,
                    updated_at = NOW()
      `,
      [tenantId, key, periodKey, amount]
    );

    // Billing logic
    let eventQuantity = 0;
    let chargedQuantity = 0; // for counters (billable consumption)
    let chargedTotal = 0;

    if (planType === "on_demand") {
      eventQuantity = amount;
      if (unitPrice > 0) {
        chargedQuantity = amount;
        chargedTotal = chargedQuantity * unitPrice;
      }
    }

    if (planType === "pro" && maxValue !== null && Number.isFinite(maxValue) && maxValue >= 0) {
      const prevOver = Math.max(0, prevTotal - maxValue);
      const nextOver = Math.max(0, nextTotal - maxValue);
      const incremental = Math.max(0, nextOver - prevOver);
      if (incremental > 0) {
        eventQuantity = incremental;
        if (unitPrice > 0) {
          chargedQuantity = incremental;
          chargedTotal = chargedQuantity * unitPrice;
        }
      }
    }

    if (eventQuantity > 0) {
      await client.query(
        `
        INSERT INTO sa.billing_events (tenant_id, service_key, quantity, unit_price, total, period_key, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,NOW())
        `,
        [tenantId, key, eventQuantity, unitPrice, chargedTotal, periodKey]
      );
      if (chargedQuantity > 0 || chargedTotal > 0) {
        await client.query(
          `
          INSERT INTO sa.billing_counters (tenant_id, service_key, period_key, quantity, total, updated_at)
          VALUES ($1,$2,$3,$4,$5,NOW())
          ON CONFLICT (tenant_id, service_key, period_key)
          DO UPDATE SET quantity = sa.billing_counters.quantity + EXCLUDED.quantity,
                        total = sa.billing_counters.total + EXCLUDED.total,
                        updated_at = NOW()
          `,
          [tenantId, key, periodKey, chargedQuantity, chargedTotal]
        );
      }
    }

    await client.query("COMMIT");
    return {
      tenant_id: tenantId,
      service_key: key,
      period_key: periodKey,
      prev_total: prevTotal,
      next_total: nextTotal,
      charged: chargedQuantity > 0 && chargedTotal > 0,
      charged_quantity: chargedQuantity,
      unit_price: unitPrice,
      charged_total: chargedTotal,
    };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore
    }
    throw error;
  } finally {
    client.release();
  }
}
