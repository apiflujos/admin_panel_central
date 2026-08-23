import { getPool } from "../../../../src/db";
import { getSuperAdminEmail } from "../../../../src/sa/sa.bootstrap";
import { startCron } from "../../../../src/infra/cron";
import { getTenantMonthlySummary } from "../../../../src/sa/sa.admin.service";
import { conRegistroDeSalud, isWorkerEnabled } from "../../../../src/services/worker-settings.service";

function prevMonthKeyUtc(now = new Date()) {
  const year = Number(now.toISOString().slice(0, 4));
  const month = Number(now.toISOString().slice(5, 7));
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  return `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
}

export function startBillingReportWorker() {
  const enabled = String(process.env.BILLING_REPORT_ENABLED || "true").toLowerCase() !== "false";
  if (!enabled) return;

  const spec = String(process.env.BILLING_REPORT_CRON || "5 0 1 * *");
  const timezone = String(process.env.BILLING_REPORT_TZ || "America/Bogota");

  startCron(
    spec,
    // Se ESPERA a que termine: con `void` el cron daba el disparo por
    // terminado al instante y el informe seguía corriendo suelto, perdiendo
    // la protección contra solapes.
    async () =>
      // Cada disparo deja constancia de cómo terminó: un cron que falla en
      // silencio no se distingue de uno que nunca se disparó.
      await conRegistroDeSalud("billing-report", async () => {
        // Interruptor de Super Admin, releído en cada disparo del cron.
        if (!(await isWorkerEnabled("billing-report"))) return;
        const pool = getPool();
        const periodKey = prevMonthKeyUtc();
        const tenants = await pool.query<{ id: number; name: string }>(
          `SELECT id, name FROM organizations ORDER BY id ASC`
        );
        const reportTo = String(process.env.BILLING_REPORT_TO || "").trim() || getSuperAdminEmail();

        const items = [];
        for (const t of tenants.rows) {
          try {
            const summary = await getTenantMonthlySummary(Number(t.id), periodKey);
            items.push({
              tenantId: t.id,
              tenantName: t.name,
              periodKey,
              billedTotal: summary.billedTotal,
              services: summary.services,
            });
          } catch (error) {
            items.push({
              tenantId: t.id,
              tenantName: t.name,
              periodKey,
              error: error instanceof Error ? error.message : "summary_error",
            });
          }
        }

        const payload = {
          type: "monthly_billing_report",
          periodKey,
          reportTo,
          generatedAt: new Date().toISOString(),
          tenants: items,
        };

        const webhook = String(process.env.BILLING_REPORT_WEBHOOK_URL || "").trim();
        if (webhook) {
          try {
            const response = await fetch(webhook, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
              signal: AbortSignal.timeout(30_000),
            });
            if (!response.ok) {
              console.error(`[billing-report] webhook returned ${response.status}`);
            } else {
              console.log("[billing-report] delivered via webhook", { periodKey, reportTo });
              return;
            }
          } catch (error) {
            console.error("[billing-report] webhook failed", error);
          }
        }

        console.log("[billing-report] monthly report", JSON.stringify(payload));
      }),
    { timezone }
  ).start();

  console.log("[billing-report] cron scheduled", { spec, timezone });
}
