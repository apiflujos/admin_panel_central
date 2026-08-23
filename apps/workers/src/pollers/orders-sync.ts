import { ShopifyClient } from "../../../../src/connectors/shopify";
import { createSyncLog } from "../../../../src/services/logs.service";
import { mapOrderToPayload } from "../../../../src/services/operations.service";
import { withEachOrganization } from "../../../../src/services/organizations.service";
import { syncShopifyOrderToAlegra } from "../../../../src/services/shopify-to-alegra.service";
import { getSyncCheckpoint, saveSyncCheckpoint } from "../../../../src/services/sync-checkpoints.service";
import {
  getShopifyConnectionByDomain,
  listConnectedShopifyDomains,
} from "../../../../src/services/store-connections.service";
import { conRegistroDeSalud, isWorkerEnabled } from "../../../../src/services/worker-settings.service";
import { puedeCorrerEnTienda } from "../../../../src/services/requisitos-worker.service";

const toIso = (value: number) => new Date(value).toISOString();
const checkpointKey = (shopDomain: string) => `orders_sync:${shopDomain}`;

const resolveSince = async (shopDomain: string, lookbackMinutes: number) => {
  // Piso de tiempo: nunca consultar más atrás que `lookbackMinutes`. Si un pedido
  // falla SIEMPRE (sin cédula, sin match, etc.), el checkpoint queda anclado en su
  // `updatedAt` y sin este tope el poller lo reprocesaría en cada tick para siempre
  // (el churn que satura el servidor). Con el tope, un pedido que falla deja de
  // reintentarse tras `lookbackMinutes`.
  const floorMs = Date.now() - lookbackMinutes * 60 * 1000;
  const checkpoint = await getSyncCheckpoint(checkpointKey(shopDomain));
  if (checkpoint?.lastStart) {
    return Math.max(Date.parse(toIso(checkpoint.lastStart)), floorMs);
  }
  return floorMs;
};

const extractUpdatedAt = (order: { updatedAt?: string | null; processedAt?: string | null }) => {
  const raw = order.updatedAt || order.processedAt || "";
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const safeCreateSyncLog = async (payload: Parameters<typeof createSyncLog>[0]) => {
  try {
    await createSyncLog(payload);
  } catch (error) {
    console.error("createSyncLog failed:", payload.entity, payload.direction, error);
  }
};

export function startOrdersSyncWorker() {
  const intervalSeconds = Number(process.env.ORDERS_SYNC_POLL_SECONDS || 300);
  let intervalMs = intervalSeconds > 0 ? intervalSeconds * 1000 : Number(process.env.ORDERS_SYNC_POLL_MS || 0);
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    return;
  }
  // Piso de 60s: correr cada pocos segundos satura el servidor sin beneficio (el
  // webhook ya factura en tiempo real; este poller es solo respaldo/catch-up).
  const MIN_INTERVAL_MS = 60_000;
  if (intervalMs < MIN_INTERVAL_MS) {
    intervalMs = MIN_INTERVAL_MS;
  }

  const batchSize = Math.max(1, Math.min(Number(process.env.ORDERS_SYNC_BATCH_SIZE || 5), 20));
  const maxOrders = Math.max(0, Number(process.env.ORDERS_SYNC_MAX_ORDERS || 0));
  const lookbackMinutes = Math.max(10, Number(process.env.ORDERS_SYNC_LOOKBACK_MINUTES || 180));

  let running = false;

  const runForOrg = async () => {
    const shopDomains = await listConnectedShopifyDomains();
    if (!shopDomains.length) return;

    for (const shopDomain of shopDomains) {
      // Requisitos del trabajo para ESTA tienda. Si no se cumplen, no se
      // lanza la tarea: una tarea que no puede terminar sólo produce
      // errores repetidos.
      if (!(await puedeCorrerEnTienda("orders-sync", shopDomain)).puedeCorrer) continue;
      try {
        const credential = await getShopifyConnectionByDomain(shopDomain);
        const client = new ShopifyClient({
          shopDomain: credential.shopDomain,
          accessToken: credential.accessToken,
        });

        const sinceMs = await resolveSince(credential.shopDomain, lookbackMinutes);
        const query = `status:any updated_at:>='${toIso(sinceMs)}'`;
        let orders = await client.listAllOrdersByQuery(query, maxOrders > 0 ? maxOrders : undefined);
        if (maxOrders > 0) {
          orders = orders.slice(0, maxOrders);
        }
        if (!orders.length) continue;

        orders.sort((a, b) => {
          const left = extractUpdatedAt(a) || 0;
          const right = extractUpdatedAt(b) || 0;
          return left - right;
        });

        let processed = 0;
        let lastSeen = sinceMs;
        // `minFailedUpdatedAt` mantiene el updatedAt más viejo entre las órdenes que fallaron,
        // para NO avanzar el checkpoint más allá de esa marca (así el próximo tick reintenta).
        let minFailedUpdatedAt: number | null = null;
        let hadFailure = false;
        for (let i = 0; i < orders.length; i += batchSize) {
          const batch = orders.slice(i, i + batchSize);
          const results = await Promise.allSettled(
            batch.map(async (order) => {
              const payload = mapOrderToPayload(order);
              await syncShopifyOrderToAlegra({
                ...(payload as Record<string, unknown>),
                __shopDomain: credential.shopDomain,
              });
              processed += 1;
              const updatedAt = extractUpdatedAt(order);
              if (updatedAt && updatedAt > lastSeen) lastSeen = updatedAt;
              return updatedAt;
            })
          );
          results.forEach((result, idx) => {
            if (result.status === "rejected") {
              hadFailure = true;
              const failedUpdatedAt = extractUpdatedAt(batch[idx]);
              if (failedUpdatedAt != null) {
                minFailedUpdatedAt =
                  minFailedUpdatedAt == null ? failedUpdatedAt : Math.min(minFailedUpdatedAt, failedUpdatedAt);
              }
            }
          });
          if (results.some((result) => result.status === "rejected")) {
            await safeCreateSyncLog({
              entity: "orders_sync",
              direction: "shopify->alegra",
              status: "fail",
              message: "Batch orders sync had failures",
              request: { shopDomain: credential.shopDomain, processed, total: orders.length },
            });
          }
        }

        // Solo avanzamos checkpoint hasta el mínimo failed - 1ms; si no hubo fails, hasta lastSeen.
        const checkpointValue =
          hadFailure && minFailedUpdatedAt != null ? Math.max(sinceMs, minFailedUpdatedAt - 1) : lastSeen;
        await saveSyncCheckpoint({
          entity: checkpointKey(credential.shopDomain),
          lastStart: checkpointValue,
          total: orders.length,
        });
        await safeCreateSyncLog({
          entity: "orders_sync",
          direction: "shopify->alegra",
          status: hadFailure ? "fail" : "success",
          message: hadFailure ? "Orders sync batch completed with failures" : "Orders sync batch completed",
          request: { shopDomain: credential.shopDomain, processed, total: orders.length },
          response: { shopDomain: credential.shopDomain, processed, total: orders.length },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Orders sync poll failed";
        await safeCreateSyncLog({
          entity: "orders_sync",
          direction: "shopify->alegra",
          status: "fail",
          message,
          request: { shopDomain },
        });
      }
    }
  };

  const pasada = async () => {
    // Interruptor de Super Admin. Se consulta en CADA pasada (no sólo al
    // arrancar) para que encender o apagar surta efecto sin reiniciar.
    if (!(await isWorkerEnabled("orders-sync"))) return;
    if (running) return;
    running = true;
    try {
      await withEachOrganization(runForOrg);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Orders sync poll failed";
      await safeCreateSyncLog({
        entity: "orders_sync",
        direction: "shopify->alegra",
        status: "fail",
        message,
      });
      // Se deja el registro en pantalla Y se relanza: si sólo se registrara,
      // la salud del trabajo diría "ok" mientras la pasada fracasa.
      throw error;
    } finally {
      running = false;
    }
  };

  // Toda pasada deja constancia de cómo terminó. `log-retention` falló
  // ~120 veces en un mes sin que nadie lo viera porque su único testigo
  // era un `console.error`.
  const run = () => conRegistroDeSalud("orders-sync", pasada);

  void run();
  setInterval(() => {
    void run();
  }, intervalMs);
}
