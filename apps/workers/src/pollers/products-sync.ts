import { createSyncLog } from "../../../../src/services/logs.service";
import {
  syncAlegraInventoryPayloadToShopify,
  syncAlegraItemPayloadToShopify,
  type AlegraInventoryPayload,
  type AlegraItem,
} from "../../../../src/services/alegra-to-shopify.service";
import { upsertAlegraItemCacheIfTracked } from "../../../../src/services/alegra-items-cache.service";
import { withEachOrganization } from "../../../../src/services/organizations.service";
import { buildSyncContext } from "../../../../src/services/sync-context";
import { getSyncCheckpoint, saveSyncCheckpoint } from "../../../../src/services/sync-checkpoints.service";
import { listConnectedShopifyDomains } from "../../../../src/services/store-connections.service";
import { errorSignature, isPermanentIntegrationError } from "../../../../src/connectors/shopify-errors";
import { getPoolMax } from "../../../../src/db";
import { isWorkerEnabled } from "../../../../src/services/worker-settings.service";

type AlegraItemRow = Record<string, unknown> & {
  id?: string | number;
  inventory?: Record<string, unknown>;
  status?: string;
};

const toIso = (value: number) => new Date(value).toISOString();
const checkpointKey = (shopDomain: string) => `products_sync:${shopDomain}`;

/** Cuántos fallos permanentes seguidos abren el cortacircuitos de una pasada. */
const DEFAULT_PERMANENT_FAILURE_LIMIT = 25;
/** Cuántos ids de ejemplo se guardan por causa (para diagnosticar sin volcar el catálogo). */
const SAMPLE_IDS_PER_SIGNATURE = 5;
/** Longitud máxima del mensaje de ejemplo que acompaña a cada causa. */
const SAMPLE_MESSAGE_MAX_CHARS = 400;

/**
 * Agrega los fallos de una pasada por causa y emite UNA línea por causa.
 *
 * Antes se hacía `console.error(..., result.reason)` por ítem, lo que volcaba el
 * objeto Error completo con su stack (~10 líneas) por cada ítem y cada pasada.
 * Con el catálogo entero fallando eran ~54.000 líneas cada 15 minutos.
 */
function createFailureReport() {
  const bySignature = new Map<
    string,
    { count: number; permanent: boolean; sampleIds: string[]; sampleMessage: string }
  >();

  return {
    record(signature: string, itemId: unknown, permanent: boolean, message?: string) {
      const entry = bySignature.get(signature) || { count: 0, permanent, sampleIds: [], sampleMessage: "" };
      entry.count += 1;
      entry.permanent = entry.permanent || permanent;
      if (entry.sampleIds.length < SAMPLE_IDS_PER_SIGNATURE && itemId != null) {
        entry.sampleIds.push(String(itemId));
      }
      // Un ejemplo del mensaje por causa. Sin esto el log agrupado dice QUÉ
      // código de error fue pero no POR QUÉ, y diagnosticar obliga a reproducir
      // el fallo a mano contra producción.
      if (!entry.sampleMessage && message) {
        entry.sampleMessage = message.slice(0, SAMPLE_MESSAGE_MAX_CHARS);
      }
      bySignature.set(signature, entry);
    },
    get totals() {
      let permanent = 0;
      let transient = 0;
      for (const entry of bySignature.values()) {
        if (entry.permanent) permanent += entry.count;
        else transient += entry.count;
      }
      return { permanent, transient };
    },
    flush(shopDomain: string, meta: { circuitOpen: boolean; limit: number }) {
      if (!bySignature.size) return;
      for (const [signature, entry] of bySignature) {
        console.error(
          `[products-sync] ${entry.count} ítem(s) fallaron` +
            ` [${entry.permanent ? "PERMANENTE" : "transitorio"}] causa=${signature}` +
            ` tienda=${shopDomain} ejemplos=${entry.sampleIds.join(",") || "-"}` +
            (entry.sampleMessage ? `\n    detalle: ${entry.sampleMessage}` : "")
        );
      }
      if (meta.circuitOpen) {
        console.error(
          `[products-sync] CORTACIRCUITOS ABIERTO en ${shopDomain}: se superaron ${meta.limit}` +
            " fallos permanentes; se aborta la pasada. Revisa la versión de la Admin API" +
            " y las mutaciones antes de reintentar."
        );
      }
      bySignature.clear();
    },
  };
}

const resolveSince = async (shopDomain: string, lookbackMinutes: number) => {
  const checkpoint = await getSyncCheckpoint(checkpointKey(shopDomain));
  if (checkpoint?.lastStart) {
    return Date.parse(toIso(checkpoint.lastStart));
  }
  return Date.now() - lookbackMinutes * 60 * 1000;
};

const extractUpdatedAt = (item: AlegraItemRow) => {
  const raw =
    (item.updated_at as string | undefined) ||
    (item.updatedAt as string | undefined) ||
    (item.created_at as string | undefined) ||
    (item.createdAt as string | undefined) ||
    "";
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const hasItemId = (item: AlegraItemRow): item is AlegraItemRow & { id: string | number } =>
  item.id !== undefined && item.id !== null;

const normalizeItemsResponse = (payload: unknown): AlegraItemRow[] => {
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.items)) return record.items as AlegraItemRow[];
  if (Array.isArray(record.data)) return record.data as AlegraItemRow[];
  if (Array.isArray(payload)) return payload as AlegraItemRow[];
  return [];
};

const safeCreateSyncLog = async (payload: Parameters<typeof createSyncLog>[0]) => {
  try {
    await createSyncLog(payload);
  } catch (error) {
    console.error("createSyncLog failed:", payload.entity, payload.direction, error);
  }
};

export function startProductsSyncWorker() {
  const intervalSeconds = Number(process.env.PRODUCTS_SYNC_POLL_SECONDS || 900);
  const intervalMs = intervalSeconds > 0 ? intervalSeconds * 1000 : Number(process.env.PRODUCTS_SYNC_POLL_MS || 0);
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    return;
  }

  // La concurrencia no puede superar al pool de Postgres: cada ítem en vuelo
  // necesita su conexión, y los que sobran esperan hasta agotar el timeout de
  // conexión y mueren con "timeout exceeded when trying to connect". Se reserva
  // una conexión para el trabajo del propio poller (checkpoints, sync logs).
  const requestedBatchSize = Math.max(1, Math.min(Number(process.env.PRODUCTS_SYNC_BATCH_SIZE || 5), 20));
  const concurrencyCeiling = Math.max(1, getPoolMax() - 1);
  const batchSize = Math.min(requestedBatchSize, concurrencyCeiling);
  if (batchSize < requestedBatchSize) {
    console.warn(
      `[products-sync] concurrencia recortada de ${requestedBatchSize} a ${batchSize}:` +
        ` DB_POOL_MAX=${getPoolMax()} no da para más. Sube DB_POOL_MAX si quieres más paralelismo.`
    );
  }
  const batchLimit = Math.max(10, Math.min(Number(process.env.PRODUCTS_SYNC_BATCH_LIMIT || 30), 30));
  const permanentFailureLimit = Math.max(
    1,
    Number(process.env.PRODUCTS_SYNC_PERMANENT_FAILURE_LIMIT || DEFAULT_PERMANENT_FAILURE_LIMIT)
  );
  const lookbackMinutes = Math.max(10, Number(process.env.PRODUCTS_SYNC_LOOKBACK_MINUTES || 180));

  let running = false;

  const runForOrg = async () => {
    const shopDomains = await listConnectedShopifyDomains();
    if (!shopDomains.length) return;
    for (const shopDomain of shopDomains) {
      try {
        const ctx = await buildSyncContext(shopDomain);
        if (!ctx.webhookItemsEnabled) continue;

        const sinceMs = await resolveSince(ctx.shopDomain, lookbackMinutes);
        let start = 0;
        let totalProcessed = 0;
        let lastSeen = sinceMs;
        let minFailedUpdatedAt: number | null = null;
        let hadFailure = false;
        let keepGoing = true;
        let permanentFailures = 0;
        let circuitOpen = false;
        const failureReport = createFailureReport();

        while (keepGoing) {
          const query = new URLSearchParams();
          query.set("updated_at_start", toIso(sinceMs));
          query.set("limit", String(batchLimit));
          query.set("start", String(start));
          query.set("metadata", "true");
          const payload = await ctx.alegra.listItemsUpdatedSince(query.toString());
          const items = normalizeItemsResponse(payload);
          if (!items.length) break;

          for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            const results = await Promise.allSettled(
              batch.map(async (item) => {
                if (!hasItemId(item)) return;
                const resolvedItem = item as AlegraItem;
                await upsertAlegraItemCacheIfTracked(resolvedItem);
                await syncAlegraItemPayloadToShopify(resolvedItem, ctx.shopDomain);
                if (item.inventory) {
                  await syncAlegraInventoryPayloadToShopify(
                    {
                      id: item.id,
                      status: typeof item.status === "string" ? item.status : undefined,
                      inventory: item.inventory as unknown as AlegraInventoryPayload["inventory"],
                    },
                    ctx.shopDomain
                  );
                }
                totalProcessed += 1;
                const updatedAt = extractUpdatedAt(item);
                if (updatedAt && updatedAt > lastSeen) lastSeen = updatedAt;
              })
            );
            results.forEach((result, idx) => {
              if (result.status !== "rejected") return;

              // isPermanentIntegrationError (y no isPermanentShopifyError) porque
              // aquí también llegan fallos que no vienen de Shopify: violaciones
              // de índice único, credenciales ausentes, 4xx de Alegra. Con la
              // versión limitada, un `duplicate key` se marcaba como transitorio
              // y bloqueaba el checkpoint para siempre.
              const permanent = isPermanentIntegrationError(result.reason);
              const signature = errorSignature(result.reason);
              const message = result.reason instanceof Error ? result.reason.message : String(result.reason ?? "");
              failureReport.record(signature, batch[idx]?.id, permanent, message);

              if (permanent) {
                // Un error permanente (mutación inexistente, input inválido,
                // scopes) no se arregla reintentando. Si retrocediéramos el
                // checkpoint por él, el poller volvería a procesar el mismo
                // ítem cada 15 min para siempre — que es exactamente lo que
                // generó 11,3 GB de log. Se cuenta, no se bloquea el avance.
                permanentFailures += 1;
                return;
              }

              hadFailure = true;
              const failedAt = extractUpdatedAt(batch[idx]);
              if (failedAt != null) {
                minFailedUpdatedAt = minFailedUpdatedAt == null ? failedAt : Math.min(minFailedUpdatedAt, failedAt);
              }
            });

            // Cortacircuitos: si el catálogo entero está fallando por la misma
            // causa permanente, seguir recorriéndolo sólo multiplica el ruido.
            if (permanentFailures >= permanentFailureLimit) {
              circuitOpen = true;
              keepGoing = false;
              break;
            }
          }

          start += items.length;
          if (items.length < batchLimit) keepGoing = false;
        }

        // Se capturan los totales ANTES del flush: flush() vacía el agregador.
        const failureTotals = failureReport.totals;
        failureReport.flush(ctx.shopDomain, { circuitOpen, limit: permanentFailureLimit });

        if (totalProcessed > 0) {
          const checkpointValue =
            hadFailure && minFailedUpdatedAt != null ? Math.max(sinceMs, minFailedUpdatedAt - 1) : lastSeen;
          await saveSyncCheckpoint({
            entity: checkpointKey(ctx.shopDomain),
            lastStart: checkpointValue,
            total: totalProcessed,
          });
        }

        const anyFailure = hadFailure || permanentFailures > 0;
        await safeCreateSyncLog({
          entity: "products_sync",
          direction: "alegra->shopify",
          status: anyFailure ? "fail" : "success",
          message: circuitOpen
            ? `Products sync abortado por cortacircuitos (${permanentFailures} fallos permanentes)`
            : anyFailure
              ? "Products sync batch completed with failures"
              : "Products sync batch completed",
          request: { shopDomain: ctx.shopDomain, processed: totalProcessed },
          response: {
            shopDomain: ctx.shopDomain,
            processed: totalProcessed,
            permanentFailures,
            transientFailures: failureTotals.transient,
            circuitOpen,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Products sync poll failed";
        await safeCreateSyncLog({
          entity: "products_sync",
          direction: "alegra->shopify",
          status: "fail",
          message,
          request: { shopDomain },
        });
      }
    }
  };

  const run = async () => {
    // Interruptor de Super Admin. Se consulta en CADA pasada (no sólo al
    // arrancar) para que encender o apagar surta efecto sin reiniciar.
    if (!(await isWorkerEnabled("products-sync"))) return;
    if (running) return;
    running = true;
    try {
      await withEachOrganization(runForOrg);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Products sync poll failed";
      await safeCreateSyncLog({
        entity: "products_sync",
        direction: "alegra->shopify",
        status: "fail",
        message,
      });
    } finally {
      running = false;
    }
  };

  void run();
  setInterval(() => {
    void run();
  }, intervalMs);
}
