import { Queue, type JobsOptions } from "bullmq";
import { getRedis } from "../infra/redis";
import type { WebhookEvent } from "./sync.service";

/**
 * Cola de despacho de webhooks entrantes (Shopify, Alegra).
 *
 * POR QUÉ EXISTE
 * --------------
 * El camino caliente de un webhook hacía 4+ operaciones contra Postgres, entre
 * ellas una transacción con tres INSERT (`webhook_events` + `sync_logs` +
 * `retry_queue`) que además pedía su propia conexión con `pool.connect()`.
 * Con `DB_POOL_MAX=3` eso agotaba el pool: el webhook que caía en ese hueco
 * esperaba hasta el timeout de conexión y recibía un HTTP 500 — y Shopify
 * desactiva las suscripciones que fallan de forma sostenida.
 *
 * QUÉ GARANTIZA
 * -------------
 * **Postgres sigue siendo el registro de verdad.** El handler graba UNA fila
 * en `webhook_events` (barata, sin transacción) y publica aquí para que el
 * trabajo pesado ocurra fuera de la petición HTTP. Redis sólo acelera: si se
 * cae o pierde un job, la fila `pending` sigue en Postgres y el recolector
 * (`webhook-reaper`) la vuelve a encolar. Ningún webhook aceptado se pierde
 * por una caída de Redis.
 */
export const WEBHOOK_QUEUE_NAME = "webhook_dispatch";

export type WebhookDispatchJob = {
  webhookEventId: number;
  orgId: number;
  event: WebhookEvent;
};

/**
 * Reintentos con backoff exponencial. Los fallos permanentes se descartan
 * antes en el procesador, así que estos intentos son para lo transitorio
 * (red, pool ocupado, 5xx de la contraparte).
 */
export const webhookJobOptions: JobsOptions = {
  attempts: 5,
  backoff: { type: "exponential", delay: 5_000 },
  removeOnComplete: { count: 200 },
  // Los fallidos se conservan más tiempo: son la dead-letter que hay que mirar.
  removeOnFail: { count: 1_000 },
};

let queue: Queue | null = null;

/**
 * Devuelve la cola, o `null` si Redis no está configurado o no se puede crear.
 * Nunca lanza: el llamador debe poder seguir por el camino de Postgres.
 */
export function getWebhookQueue(): Queue | null {
  if (queue) return queue;
  try {
    queue = new Queue(WEBHOOK_QUEUE_NAME, {
      connection: getRedis(),
      defaultJobOptions: webhookJobOptions,
    });
    return queue;
  } catch (error) {
    // Sin REDIS_URL o sin Redis: el llamador usa el camino de respaldo. Se DEJA
    // CONSTANCIA: este catch estaba mudo, así que una cola que no se creaba
    // parecía una cola vacía y nadie se enteraba.
    console.error(
      "[webhook-queue] no se pudo crear la cola; se usará el camino de Postgres:",
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

/**
 * Identificador del trabajo en la cola, derivado del `webhookEventId`.
 *
 * SIN DOS PUNTOS: BullMQ lanza `Custom Id cannot contain :` y `add()` falla.
 * Como el fallo se capturaba y se devolvía `false`, TODOS los webhooks caían
 * en silencio al camino de Postgres y la cola de Redis nunca recibió nada.
 * Se detectó con 177 rechazos seguidos en producción y la cola vacía.
 */
export function webhookJobId(webhookEventId: number | string) {
  return `webhook-${webhookEventId}`;
}

/**
 * Publica un webhook para su procesamiento asíncrono.
 *
 * Devuelve `true` si quedó encolado. Ante cualquier fallo devuelve `false` en
 * vez de lanzar: el handler necesita poder responder 200 a Shopify y dejar la
 * fila `pending` para el recolector.
 *
 * El `jobId` se deriva de `webhookEventId`, así que reencolar el mismo evento
 * (por ejemplo desde el recolector) no lo duplica mientras siga en la cola.
 */
export async function publishWebhookEvent(job: WebhookDispatchJob): Promise<boolean> {
  const q = getWebhookQueue();
  if (!q) return false;
  try {
    await q.add(`${job.event.source}:${job.event.eventType}`, job, {
      jobId: webhookJobId(job.webhookEventId),
    });
    return true;
  } catch (error) {
    console.error(
      `[webhook-queue] no se pudo encolar webhookEventId=${job.webhookEventId}:`,
      error instanceof Error ? error.message : error
    );
    return false;
  }
}
