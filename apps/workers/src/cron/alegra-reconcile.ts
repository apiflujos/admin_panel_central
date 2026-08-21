import { getOrgId, getPool } from "../../../../src/db";
import { resolveAlegraClientForStore } from "../../../../src/services/alegra-product-import.service";
import { createSyncLog } from "../../../../src/services/logs.service";
import { withEachOrganization } from "../../../../src/services/organizations.service";
import { isWorkerEnabled } from "../../../../src/services/worker-settings.service";

/**
 * Fase 2/3 — Reconciliación de facturas con Alegra (read-only, no muta).
 *
 * Verifica que las facturas que Becam creó SIGAN existiendo en Alegra y reporta
 * su estado actual (incluida la emisión electrónica DIAN). NO sobrescribe el
 * `alegra_status` local (que la UI usa con otro vocabulario) — solo AVISA de
 * desvíos: facturas borradas/anuladas en Alegra u orphans. Barrido dirigido y
 * acotado (respeta el presupuesto de 150 req/min de Alegra).
 */

type AlegraInvoiceLike = {
  status?: string;
  stamp?: { cufe?: string; uuid?: string; legalStatus?: string } | null;
  numberTemplate?: { fullNumber?: string } | null;
};

/** Fase 3: estado legible incluyendo si está emitida electrónicamente (DIAN). */
function describeStatus(inv: AlegraInvoiceLike): string {
  const status = String(inv?.status || "").toLowerCase();
  const stamp = inv?.stamp;
  const isElectronic = Boolean(stamp && (stamp.cufe || stamp.uuid || stamp.legalStatus));
  const base =
    status === "void"
      ? "anulada"
      : status === "closed"
        ? "pagada"
        : status === "open"
          ? "emitida"
          : status === "draft"
            ? "borrador"
            : status || "desconocido";
  return isElectronic ? `${base}+DIAN` : base;
}

async function reconcileOrg() {
  const pool = getPool();
  const orgId = getOrgId();
  const batch = Math.max(1, Math.min(Number(process.env.ALEGRA_RECONCILE_BATCH || 15), 50));

  const { rows } = await pool.query<{ id: number; alegra_invoice_id: string; invoice_number: string | null }>(
    `SELECT id, alegra_invoice_id, invoice_number
     FROM orders
     WHERE organization_id = $1 AND alegra_invoice_id IS NOT NULL
     ORDER BY updated_at ASC
     LIMIT $2`,
    [orgId, batch]
  );
  if (!rows.length) return;

  let client: Awaited<ReturnType<typeof resolveAlegraClientForStore>>;
  try {
    client = await resolveAlegraClientForStore(1); // cuenta compartida de la org
  } catch {
    return; // Alegra no conectado para esta org
  }

  const tally: Record<string, number> = {};
  const orphans: string[] = [];

  for (const row of rows) {
    try {
      const inv = (await client.getInvoice(String(row.alegra_invoice_id))) as AlegraInvoiceLike;
      const desc = describeStatus(inv);
      tally[desc] = (tally[desc] || 0) + 1;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("404") || msg.toLowerCase().includes("not found") || msg.includes("no encontr")) {
        orphans.push(`${row.invoice_number || row.alegra_invoice_id}`);
      }
      // otros errores (rate-limit, timeout): se reintentan el próximo ciclo.
    }
    await new Promise((resolve) => setTimeout(resolve, 250)); // espaciar (rate-limit)
  }

  await createSyncLog({
    entity: "reconcile",
    direction: "alegra->shopify",
    status: orphans.length ? "warn" : "success",
    message: orphans.length
      ? `Reconcile: ${orphans.length} facturas NO existen en Alegra (${orphans.slice(0, 10).join(", ")})`
      : `Reconcile OK: ${rows.length} facturas verificadas`,
    request: { revisadas: rows.length, tally, orphans: orphans.slice(0, 20) },
  });
}

export function startAlegraReconcileWorker() {
  const intervalMs = Number(process.env.ALEGRA_RECONCILE_INTERVAL_MS || 15 * 60 * 1000); // 15 min
  if (!(intervalMs > 0)) return;

  const run = async () => {
    // Interruptor de Super Admin. Se consulta en CADA pasada (no sólo al
    // arrancar) para que encender o apagar surta efecto sin reiniciar.
    if (!(await isWorkerEnabled("alegra-reconcile"))) return;
    try {
      await withEachOrganization(reconcileOrg);
    } catch (error) {
      console.error("[alegra-reconcile] falló:", error instanceof Error ? error.message : error);
    }
  };

  setTimeout(() => void run(), 4 * 60 * 1000); // primer barrido a los 4 min
  setInterval(() => void run(), intervalMs);
}
