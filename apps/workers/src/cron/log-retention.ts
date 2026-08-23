import { getPool } from "../../../../src/db";
import { conRegistroDeSalud, isWorkerEnabled } from "../../../../src/services/worker-settings.service";

/**
 * Retención de tablas de logs/eventos para que no crezcan sin límite (hoy
 * sync_logs pesa >200 MB). Borra en LOTES pequeños para no bloquear la tabla.
 * Días de retención configurables por env.
 */
const NOISE_DAYS = Number(process.env.NOISE_LOGS_RETENTION_DAYS || 3);

/**
 * `retry_queue` apunta a `sync_logs` con clave foránea, así que borrar un
 * registro al que todavía apunta un reintento hace fallar el DELETE ENTERO.
 * Eso llevaba pasando en cada pasada desde hace un mes: la tabla nunca se
 * podó y llegó a 188 MB con 52.312 filas.
 *
 * `protegido` excluye del borrado los registros que aún sostienen un reintento
 * VIVO. Un reintento pendiente o en curso no se toca jamás: perderlo
 * significaría perder un pedido.
 */
const REINTENTO_VIVO = "NOT EXISTS (SELECT 1 FROM retry_queue rq WHERE rq.sync_log_id = sync_logs.id)";

const TABLES: Array<{
  table: string;
  tsColumn: string;
  days: number;
  where?: string;
  label?: string;
  protegido?: string;
}> = [
  // Logs de ALTO volumen y bajo valor (churn del poller / warns repetidos): se
  // retienen pocos días. Son ~78% de sync_logs.
  {
    table: "sync_logs",
    tsColumn: "created_at",
    days: NOISE_DAYS,
    where: "entity = 'orders_sync'",
    label: "sync_logs[orders_sync]",
    protegido: REINTENTO_VIVO,
  },
  {
    table: "sync_logs",
    tsColumn: "created_at",
    days: NOISE_DAYS,
    where: "message LIKE 'Invoice settings incomplete%'",
    label: "sync_logs[invoice-settings-warn]",
    protegido: REINTENTO_VIVO,
  },
  // Retención general.
  {
    table: "sync_logs",
    tsColumn: "created_at",
    days: Number(process.env.SYNC_LOGS_RETENTION_DAYS || 30),
    protegido: REINTENTO_VIVO,
  },
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

/**
 * Suelta los reintentos ya TERMINADOS que anclan registros viejos.
 *
 * Sólo `done`, `failed` y `skipped`: son finales, no van a volver a
 * ejecutarse y lo único que hacen es impedir que se pode el registro.
 * `pending` y `processing` NO se tocan — ahí vive trabajo por hacer.
 */
async function soltarReintentosTerminados(days: number) {
  const res = await getPool().query(
    `
    DELETE FROM retry_queue
     WHERE status IN ('done', 'failed', 'skipped')
       AND sync_log_id IN (
         SELECT id FROM sync_logs WHERE created_at < now() - ($1 || ' days')::interval
       )
    `,
    [String(days)]
  );
  if (res.rowCount) console.log(`[log-retention] retry_queue: ${res.rowCount} reintentos terminados liberados`);
}

async function purge(
  table: string,
  tsColumn: string,
  days: number,
  where?: string,
  label?: string,
  protegido?: string
) {
  if (!(days > 0)) return;
  const pool = getPool();
  // `table`/`tsColumn`/`where`/`protegido` son constantes internas (no entran
  // del usuario) → sin inyección.
  const cond =
    `${tsColumn} < now() - ($1 || ' days')::interval` +
    `${where ? ` AND ${where}` : ""}` +
    `${protegido ? ` AND ${protegido}` : ""}`;
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

  const pasada = async () => {
    // Interruptor de Super Admin. Se consulta en CADA pasada (no sólo al
    // arrancar) para que encender o apagar surta efecto sin reiniciar.
    if (!(await isWorkerEnabled("log-retention"))) return;

    // Los fallos se ACUMULAN y se lanzan al final. Antes cada `catch` escribía
    // un `console.error` y la pasada terminaba "bien" aunque no hubiera podado
    // una sola fila. Así estuvo un mes sin que nadie lo notara.
    const fallos: string[] = [];

    // Primero se sueltan los reintentos terminados; si no, el borrado de
    // `sync_logs` choca contra la clave foránea y no se poda nada.
    try {
      await soltarReintentosTerminados(Number(process.env.SYNC_LOGS_RETENTION_DAYS || 30));
    } catch (error) {
      fallos.push(`liberar reintentos: ${error instanceof Error ? error.message : String(error)}`);
    }
    for (const { table, tsColumn, days, where, label, protegido } of TABLES) {
      try {
        await purge(table, tsColumn, days, where, label, protegido);
      } catch (error) {
        fallos.push(`${label || table}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Se lanza para que quede registrado como avería y se vea en la pantalla,
    // en lugar de morir en un log.
    if (fallos.length) throw new Error(`No se pudo podar: ${fallos.join(" | ")}`);
  };

  // Primera corrida diferida 5 min para no competir con el arranque de los workers.
  // Toda pasada deja constancia de cómo terminó. `log-retention` falló
  // ~120 veces en un mes sin que nadie lo viera porque su único testigo
  // era un `console.error`.
  const run = () => conRegistroDeSalud("log-retention", pasada);

  setTimeout(() => void run(), 5 * 60 * 1000);
  setInterval(() => void run(), intervalMs);
}
