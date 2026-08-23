import { getPool } from "../../../../src/db";
import { createSyncLog } from "../../../../src/services/logs.service";
import {
  FALLOS_PARA_AVERIA,
  conRegistroDeSalud,
  isWorkerEnabled,
} from "../../../../src/services/worker-settings.service";

/**
 * Monitor de salud: cada N minutos calcula métricas clave (errores, cola de
 * reintentos, churn del poller, tamaño de logs) y, si alguna cruza su umbral,
 * registra una ALERTA visible (console + sync_logs entity='monitor'). Da
 * visibilidad de la carga sin agregar dependencias externas.
 */
type Metrics = {
  fails_1h: number;
  ordersSyncChurn_1h: number;
  retryPending: number;
  syncLogsRows: number;
  /** Trabajos que llevan varias pasadas seguidas fallando. */
  trabajosAveriados: Array<{ clave: string; fallos: number; error: string | null }>;
};

const THRESHOLDS = {
  fails_1h: Number(process.env.ALERT_FAILS_PER_HOUR || 200),
  ordersSyncChurn_1h: Number(process.env.ALERT_CHURN_PER_HOUR || 400),
  retryPending: Number(process.env.ALERT_RETRY_PENDING || 500),
  syncLogsRows: Number(process.env.ALERT_SYNC_LOGS_ROWS || 500_000),
};

/**
 * Vigilar los propios trabajos, no sólo las métricas del negocio.
 *
 * El monitor miraba errores, cola de reintentos y tamaño de logs, pero no si
 * los trabajos FUNCIONABAN. Por eso `log-retention` pudo fallar unas 120 veces
 * en un mes sin que ninguna alerta saltara: sus fallos no eran una métrica.
 */
async function trabajosAveriados() {
  const { rows } = await getPool().query<{ worker_key: string; fallos_seguidos: number; ultimo_error: string | null }>(
    `
    SELECT worker_key, fallos_seguidos, ultimo_error
      FROM worker_settings
     WHERE enabled = true AND fallos_seguidos >= $1
     ORDER BY fallos_seguidos DESC
    `,
    [FALLOS_PARA_AVERIA]
  );
  return rows.map((r) => ({ clave: r.worker_key, fallos: Number(r.fallos_seguidos), error: r.ultimo_error }));
}

async function collect(): Promise<Metrics> {
  const pool = getPool();
  const { rows } = await pool.query<{
    fails_1h: string;
    orderssync_1h: string;
    retry_pending: string;
    sync_logs_rows: string;
  }>(`
    SELECT
      (SELECT count(*) FROM sync_logs WHERE status='fail' AND created_at > now()-interval '1 hour') fails_1h,
      (SELECT count(*) FROM sync_logs WHERE entity='orders_sync' AND created_at > now()-interval '1 hour') orderssync_1h,
      (SELECT count(*) FROM retry_queue WHERE status IN ('pending','processing')) retry_pending,
      (SELECT count(*) FROM sync_logs) sync_logs_rows
  `);
  const r = rows[0] || ({} as Record<string, string>);
  return {
    fails_1h: Number(r.fails_1h || 0),
    ordersSyncChurn_1h: Number(r.orderssync_1h || 0),
    retryPending: Number(r.retry_pending || 0),
    syncLogsRows: Number(r.sync_logs_rows || 0),
    trabajosAveriados: await trabajosAveriados(),
  };
}

export function startHealthMonitorWorker() {
  const intervalMs = Number(process.env.HEALTH_MONITOR_INTERVAL_MS || 10 * 60 * 1000); // 10 min
  if (!(intervalMs > 0)) return;

  const pasada = async () => {
    // Interruptor de Super Admin. Se consulta en CADA pasada (no sólo al
    // arrancar) para que encender o apagar surta efecto sin reiniciar.
    if (!(await isWorkerEnabled("health-monitor"))) return;
    let m: Metrics;
    try {
      m = await collect();
    } catch (error) {
      console.error(
        "[health-monitor] no se pudieron calcular métricas:",
        error instanceof Error ? error.message : error
      );
      return;
    }

    const breaches: string[] = [];
    if (m.fails_1h > THRESHOLDS.fails_1h) breaches.push(`fails_1h=${m.fails_1h} (>${THRESHOLDS.fails_1h})`);
    if (m.ordersSyncChurn_1h > THRESHOLDS.ordersSyncChurn_1h)
      breaches.push(`churn_1h=${m.ordersSyncChurn_1h} (>${THRESHOLDS.ordersSyncChurn_1h})`);
    if (m.retryPending > THRESHOLDS.retryPending)
      breaches.push(`retry_pending=${m.retryPending} (>${THRESHOLDS.retryPending})`);
    if (m.syncLogsRows > THRESHOLDS.syncLogsRows)
      breaches.push(`sync_logs_rows=${m.syncLogsRows} (>${THRESHOLDS.syncLogsRows})`);
    // Un trabajo encendido que falla una y otra vez es la avería MÁS grave que
    // puede haber: significa que algo lleva sin hacerse desde hace tiempo.
    for (const t of m.trabajosAveriados) {
      breaches.push(`trabajo "${t.clave}" lleva ${t.fallos} pasadas fallando${t.error ? `: ${t.error}` : ""}`);
    }

    console.log(
      `[health-monitor] fails_1h=${m.fails_1h} churn_1h=${m.ordersSyncChurn_1h} ` +
        `retry_pending=${m.retryPending} sync_logs_rows=${m.syncLogsRows}`
    );

    if (breaches.length) {
      const message = `ALERTA de carga: ${breaches.join(" · ")}`;
      console.error(`[health-monitor] ${message}`);
      // También lo deja visible en la plataforma (Logs).
      try {
        await createSyncLog({
          entity: "monitor",
          direction: "shopify->alegra",
          status: "fail",
          message,
          request: m as unknown as Record<string, unknown>,
        });
      } catch {
        /* el log de alerta no debe tumbar el monitor */
      }
    }
  };

  // Toda pasada deja constancia de cómo terminó. `log-retention` falló
  // ~120 veces en un mes sin que nadie lo viera porque su único testigo
  // era un `console.error`.
  const run = () => conRegistroDeSalud("health-monitor", pasada);

  setTimeout(() => void run(), 2 * 60 * 1000); // primera medición a los 2 min
  setInterval(() => void run(), intervalMs);
}
