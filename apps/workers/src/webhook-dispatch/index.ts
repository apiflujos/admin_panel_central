import { Worker } from "bullmq";
import { getPoolMax, getPool, runWithOrg } from "../../../../src/db";
import { getRedis } from "../../../../src/infra/redis";
import { processWebhookDispatchJob } from "../../../../src/services/sync.service";
import {
  WEBHOOK_QUEUE_NAME,
  publishWebhookEvent,
  type WebhookDispatchJob,
} from "../../../../src/services/webhook-queue";
import { isPermanentIntegrationError } from "../../../../src/connectors/shopify-errors";

/**
 * Consumidor de la cola de webhooks y red de seguridad de los rezagados.
 *
 * El worker procesa lo que el handler HTTP publicó en Redis. El recolector
 * ("reaper") cubre el hueco estructural que existía antes: `webhook_events`
 * era una cola sin recolector — si el disparo inicial se perdía, la fila se
 * quedaba en `pending` para siempre. En producción había 8.375 filas así.
 */

/** Cada cuánto barre el recolector en busca de filas `pending` sin despachar. */
const REAPER_INTERVAL_MS = Math.max(
  60_000,
  Number(process.env.WEBHOOK_REAPER_INTERVAL_MS || 5 * 60_000)
);

/**
 * Margen antes de considerar rezagada una fila. Evita pelear con un job que
 * acaba de encolarse y todavía no ha empezado.
 */
const REAPER_MIN_AGE_MINUTES = Math.max(1, Number(process.env.WEBHOOK_REAPER_MIN_AGE_MINUTES || 10));

/**
 * Antigüedad máxima que el recolector toca, en horas.
 *
 * IMPORTANTE: este límite es deliberado, no una optimización. La tabla arrastra
 * miles de filas `pending` fosilizadas de un incidente de julio de 2026 que NO
 * deben reprocesarse — reenviarlas crearía facturas y movimientos de inventario
 * a destiempo. El recolector sólo recupera lo reciente.
 */
const REAPER_MAX_AGE_HOURS = Math.max(1, Number(process.env.WEBHOOK_REAPER_MAX_AGE_HOURS || 24));

/** Cuántas filas rezagadas se reencolan por barrido. */
const REAPER_BATCH = Math.max(1, Math.min(Number(process.env.WEBHOOK_REAPER_BATCH || 100), 500));

type PendingRow = {
  id: number;
  organization_id: number;
  source: string;
  event_type: string;
  payload_json: unknown;
};

async function reapStalledWebhookEvents() {
  const pool = getPool();
  const rows = await pool
    .query<PendingRow>(
      `
      SELECT id, organization_id, source, event_type, payload_json
        FROM webhook_events
       WHERE status = 'pending'
         AND received_at < NOW() - ($1 * INTERVAL '1 minute')
         AND received_at > NOW() - ($2 * INTERVAL '1 hour')
       ORDER BY id
       LIMIT $3
      `,
      [REAPER_MIN_AGE_MINUTES, REAPER_MAX_AGE_HOURS, REAPER_BATCH]
    )
    .catch((error) => {
      console.error("[webhook-reaper] no se pudo consultar pendientes:", error?.message || error);
      return null;
    });

  if (!rows?.rows.length) return;

  let requeued = 0;
  for (const row of rows.rows) {
    const ok = await publishWebhookEvent({
      webhookEventId: row.id,
      orgId: row.organization_id,
      event: {
        source: row.source as WebhookDispatchJob["event"]["source"],
        eventType: row.event_type,
        payload: row.payload_json,
      },
    });
    if (ok) requeued += 1;
  }

  if (requeued) {
    console.warn(
      `[webhook-reaper] ${requeued} webhook(s) rezagados reencolados` +
        ` (ventana: ${REAPER_MIN_AGE_MINUTES}min–${REAPER_MAX_AGE_HOURS}h).`
    );
  }
}

export function startWebhookDispatchWorker() {
  let redis;
  try {
    redis = getRedis();
  } catch {
    console.warn(
      "[webhook-dispatch] sin REDIS_URL: los webhooks seguirán por retry_queue (camino de respaldo)."
    );
    return;
  }

  // Nunca más tareas en vuelo que conexiones disponibles: cada webhook en
  // proceso necesita la suya, y pedir de más es lo que agotaba el pool.
  const concurrency = Math.max(1, getPoolMax() - 1);

  const worker = new Worker<WebhookDispatchJob>(
    WEBHOOK_QUEUE_NAME,
    async (job) => {
      const { webhookEventId, orgId, event } = job.data;
      return runWithOrg(orgId, () => processWebhookDispatchJob({ webhookEventId, event }));
    },
    { connection: redis, concurrency }
  );

  worker.on("failed", (job, error) => {
    const permanent = isPermanentIntegrationError(error);
    const id = job?.data?.webhookEventId ?? "?";
    console.error(
      `[webhook-dispatch] webhookEventId=${id} falló` +
        ` (intento ${job?.attemptsMade ?? 0}/${job?.opts?.attempts ?? 0})` +
        `${permanent ? " [PERMANENTE]" : ""}: ${error?.message || error}`
    );
    // Un fallo permanente no mejora reintentando: se descarta ya y queda en la
    // dead-letter de BullMQ para inspección.
    if (permanent && job) {
      try {
        job.discard();
      } catch {
        // discard() sólo marca el job para no reintentar; si falla, BullMQ
        // agotará los intentos restantes y acabará en la dead-letter igual.
      }
    }
  });

  worker.on("error", (error) => {
    console.error("[webhook-dispatch] error del worker:", error?.message || error);
  });

  console.log(`[webhook-dispatch] worker iniciado (concurrencia=${concurrency}, cola=${WEBHOOK_QUEUE_NAME})`);

  void reapStalledWebhookEvents();
  setInterval(() => {
    void reapStalledWebhookEvents();
  }, REAPER_INTERVAL_MS);
}
