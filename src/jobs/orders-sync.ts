import { ShopifyClient } from "../connectors/shopify";
import { createSyncLog } from "../services/logs.service";
import { mapOrderToPayload } from "../services/operations.service";
import { syncShopifyOrderToAlegra } from "../services/shopify-to-alegra.service";
import { getShopifyCredential } from "../services/settings.service";
import { getSyncCheckpoint, saveSyncCheckpoint } from "../services/sync-checkpoints.service";

const toIso = (value: number) => new Date(value).toISOString();

const resolveSince = async (lookbackMinutes: number) => {
  const checkpoint = await getSyncCheckpoint("orders_sync");
  if (checkpoint?.lastStart) {
    return Date.parse(toIso(checkpoint.lastStart));
  }
  return Date.now() - lookbackMinutes * 60 * 1000;
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

export function startOrdersSyncPoller() {
  const intervalSeconds = Number(process.env.ORDERS_SYNC_POLL_SECONDS || 300);
  const intervalMs =
    intervalSeconds > 0
      ? intervalSeconds * 1000
      : Number(process.env.ORDERS_SYNC_POLL_MS || 0);
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    return;
  }

  const batchSize = Math.max(1, Math.min(Number(process.env.ORDERS_SYNC_BATCH_SIZE || 5), 20));
  const maxOrders = Math.max(0, Number(process.env.ORDERS_SYNC_MAX_ORDERS || 0));
  const lookbackMinutes = Math.max(10, Number(process.env.ORDERS_SYNC_LOOKBACK_MINUTES || 180));

  let running = false;

  const run = async () => {
    if (running) return;
    running = true;
    try {
      const credential = await getShopifyCredential();
      const client = new ShopifyClient({
        shopDomain: credential.shopDomain,
        accessToken: credential.accessToken,
        apiVersion: credential.apiVersion,
      });

      const sinceMs = await resolveSince(lookbackMinutes);
      const query = `status:any updated_at:>='${toIso(sinceMs)}'`;
      let orders = await client.listAllOrdersByQuery(query, maxOrders > 0 ? maxOrders : undefined);
      if (maxOrders > 0) {
        orders = orders.slice(0, maxOrders);
      }
      if (!orders.length) {
        running = false;
        return;
      }

      orders.sort((a, b) => {
        const left = extractUpdatedAt(a) || 0;
        const right = extractUpdatedAt(b) || 0;
        return left - right;
      });

      let processed = 0;
      let lastSeen = sinceMs;
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
            if (updatedAt && updatedAt > lastSeen) {
              lastSeen = updatedAt;
            }
          })
        );
        if (results.some((result) => result.status === "rejected")) {
          await safeCreateSyncLog({
            entity: "orders_sync",
            direction: "shopify->alegra",
            status: "fail",
            message: "Batch orders sync had failures",
            request: { processed, total: orders.length },
          });
        }
      }

      await saveSyncCheckpoint({
        entity: "orders_sync",
        lastStart: lastSeen,
        total: orders.length,
      });
      await safeCreateSyncLog({
        entity: "orders_sync",
        direction: "shopify->alegra",
        status: "success",
        message: "Orders sync batch completed",
        request: { processed, total: orders.length },
        response: { processed, total: orders.length },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Orders sync poll failed";
      await safeCreateSyncLog({
        entity: "orders_sync",
        direction: "shopify->alegra",
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
