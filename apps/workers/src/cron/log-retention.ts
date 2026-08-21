import { getPool } from "../../../../src/db";
import { isWorkerEnabled } from "../../../../src/services/worker-settings.service";

/**
 * Retención de tablas de logs/eventos para que no crezcan sin límite (hoy
 * sync_logs pesa >200 MB). Borra en LOTES pequeños para no bloquear la tabla.
 * Días de retención configurables por env.
 */
const NOISE_DAYS = Number(process.env.NOISE_LOGS_RETENTION_DAYS || 3);
const TABLES: Array<{ table: string; tsColumn: string; days: number; where?: string; label?: string }> = [
  // Logs de ALTO volumen y bajo valor (churn del poller / warns repetidos): se
  // retienen pocos días. Son ~78% de sync_logs.
  {
    table: "sync_logs",
    tsColumn: "created_at",
    days: NOISE_DAYS,
    where: "entity = 'orders_sync'",
    label: "sync_logs[orders_sync]",
  },
  {
    table: "sync_logs",
    tsColumn: "created_at",
    days: NOISE_DAYS,
    where: "message LIKE 'Invoice settings incomplete%'",
    label: "sync_logs[invoice-settings-warn]",
  },
  // Retención general.
  { table: "sync_logs", tsColumn: "created_at", days: Number(process.env.SYNC_LOGS_RETENTION_DAYS || 30) },
  {
    table: "inventory_transfer_decisions",
    tsColumn: "created_at",
    days: Number(process.env.TRANSFER_DECISIONS_RETENTION_DAYS || 30),
  },
  { table: "webhook_events", tsColumn: "received_at", days: Number(process.env.WEBHOOK_EVENTS_RETENTION_DAYS || 90) },
  {
    table: "webhook_receipts",
    tsColumn: "received_at",
    days: Number(process.env.WEBHOOK_RECEIPTS_RETENTION_DAYS || 90),
  },
];

const BATCH = 5000;
const MAX_BATCHES_PER_RUN = 60; // hasta 300k filas por regla por corrida

async function purge(table: string, tsColumn: string, days: number, where?: string, label?: string) {
  if (!(days > 0)) return;
  const pool = getPool();
  // `table`/`tsColumn`/`where` son constantes internas (no entran del usuario) → sin inyección.
  const cond = `${tsColumn} < now() - ($1 || ' days')::interval${where ? ` AND ${where}` : ""}`;
  let total = 0;
  for (let i = 0; i < MAX_BATCHES_PER_RUN; i += 1) {
    const res = await pool.query(
      `DELETE FROM ${table} WHERE ctid IN (SELECT ctid FROM ${table} WHERE ${cond} LIMIT ${BATCH})`,
      [String(days)]
    );
    total += res.rowCount || 0;
    if (!res.rowCount) break;
  }
  if (total) console.log(`[log-retention] ${label || table}: ${total} filas borradas (> ${days} días)`);
}

export function startLogRetentionWorker() {
  const intervalMs = Number(process.env.LOG_RETENTION_INTERVAL_MS || 6 * 60 * 60 * 1000); // cada 6h
  if (!(intervalMs > 0)) return;

  const run = async () => {
    // Interruptor de Super Admin. Se consulta en CADA pasada (no sólo al
    // arrancar) para que encender o apagar surta efecto sin reiniciar.
    if (!(await isWorkerEnabled("log-retention"))) return;
    for (const { table, tsColumn, days, where, label } of TABLES) {
      try {
        await purge(table, tsColumn, days, where, label);
      } catch (error) {
        console.error(`[log-retention] ${label || table} falló:`, error instanceof Error ? error.message : error);
      }
    }
  };

  // Primera corrida diferida 5 min para no competir con el arranque de los workers.
  setTimeout(() => void run(), 5 * 60 * 1000);
  setInterval(() => void run(), intervalMs);
}
