import { getPool } from "../../../../src/db";

/**
 * Retención de tablas de logs/eventos para que no crezcan sin límite (hoy
 * sync_logs pesa >200 MB). Borra en LOTES pequeños para no bloquear la tabla.
 * Días de retención configurables por env.
 */
const TABLES: Array<{ table: string; tsColumn: string; days: number }> = [
  { table: "sync_logs", tsColumn: "created_at", days: Number(process.env.SYNC_LOGS_RETENTION_DAYS || 30) },
  {
    table: "inventory_transfer_decisions",
    tsColumn: "created_at",
    days: Number(process.env.TRANSFER_DECISIONS_RETENTION_DAYS || 30),
  },
  { table: "webhook_events", tsColumn: "received_at", days: Number(process.env.WEBHOOK_EVENTS_RETENTION_DAYS || 90) },
  { table: "webhook_receipts", tsColumn: "received_at", days: Number(process.env.WEBHOOK_RECEIPTS_RETENTION_DAYS || 90) },
];

const BATCH = 5000;
const MAX_BATCHES_PER_RUN = 40; // hasta 200k filas por tabla por corrida

async function purge(table: string, tsColumn: string, days: number) {
  if (!(days > 0)) return;
  const pool = getPool();
  let total = 0;
  for (let i = 0; i < MAX_BATCHES_PER_RUN; i += 1) {
    // `table`/`tsColumn` son constantes internas (no entran del usuario) → sin riesgo de inyección.
    const res = await pool.query(
      `DELETE FROM ${table} WHERE ctid IN (
         SELECT ctid FROM ${table} WHERE ${tsColumn} < now() - ($1 || ' days')::interval LIMIT ${BATCH}
       )`,
      [String(days)]
    );
    total += res.rowCount || 0;
    if (!res.rowCount) break;
  }
  if (total) console.log(`[log-retention] ${table}: ${total} filas borradas (> ${days} días)`);
}

export function startLogRetentionWorker() {
  const intervalMs = Number(process.env.LOG_RETENTION_INTERVAL_MS || 6 * 60 * 60 * 1000); // cada 6h
  if (!(intervalMs > 0)) return;

  const run = async () => {
    for (const { table, tsColumn, days } of TABLES) {
      try {
        await purge(table, tsColumn, days);
      } catch (error) {
        console.error(`[log-retention] ${table} falló:`, error instanceof Error ? error.message : error);
      }
    }
  };

  // Primera corrida diferida 5 min para no competir con el arranque de los workers.
  setTimeout(() => void run(), 5 * 60 * 1000);
  setInterval(() => void run(), intervalMs);
}
