import { AlegraClient } from "../connectors/alegra";
import { createSyncLog } from "../services/logs.service";
import { syncAlegraInventoryPayloadToShopify, syncAlegraItemPayloadToShopify, type AlegraInventoryPayload } from "../services/alegra-to-shopify.service";
import { getAlegraCredential } from "../services/settings.service";
import { getSyncCheckpoint, saveSyncCheckpoint } from "../services/sync-checkpoints.service";
import { getAlegraBaseUrl } from "../utils/alegra-env";

type AlegraItemRow = Record<string, unknown> & {
  id?: string | number;
  inventory?: Record<string, unknown>;
  status?: string;
};

const toIso = (value: number) => new Date(value).toISOString();

const resolveSince = async (lookbackMinutes: number) => {
  const checkpoint = await getSyncCheckpoint("products_sync");
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

const normalizeItemsResponse = (payload: unknown): AlegraItemRow[] => {
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.items)) return record.items as AlegraItemRow[];
  if (Array.isArray(record.data)) return record.data as AlegraItemRow[];
  if (Array.isArray(payload)) return payload as AlegraItemRow[];
  return [];
};

export function startProductsSyncPoller() {
  const intervalSeconds = Number(process.env.PRODUCTS_SYNC_POLL_SECONDS || 900);
  const intervalMs =
    intervalSeconds > 0
      ? intervalSeconds * 1000
      : Number(process.env.PRODUCTS_SYNC_POLL_MS || 0);
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    return;
  }

  const batchSize = Math.max(1, Math.min(Number(process.env.PRODUCTS_SYNC_BATCH_SIZE || 5), 20));
  const batchLimit = Math.max(10, Math.min(Number(process.env.PRODUCTS_SYNC_BATCH_LIMIT || 50), 200));
  const lookbackMinutes = Math.max(10, Number(process.env.PRODUCTS_SYNC_LOOKBACK_MINUTES || 180));

  let running = false;

  const run = async () => {
    if (running) return;
    running = true;
    try {
      const credential = await getAlegraCredential();
      const alegra = new AlegraClient({
        email: credential.email,
        apiKey: credential.apiKey,
        baseUrl: getAlegraBaseUrl(credential.environment),
      });

      const sinceMs = await resolveSince(lookbackMinutes);
      let start = 0;
      let totalProcessed = 0;
      let lastSeen = sinceMs;
      let keepGoing = true;

      while (keepGoing) {
        const query = new URLSearchParams();
        query.set("updated_at_start", toIso(sinceMs));
        query.set("limit", String(batchLimit));
        query.set("start", String(start));
        query.set("metadata", "true");
        const payload = await alegra.listItemsUpdatedSince(query.toString());
        const items = normalizeItemsResponse(payload);
        if (!items.length) {
          break;
        }

        for (let i = 0; i < items.length; i += batchSize) {
          const batch = items.slice(i, i + batchSize);
          await Promise.allSettled(
            batch.map(async (item) => {
              await syncAlegraItemPayloadToShopify(item);
              if (item.inventory) {
                await syncAlegraInventoryPayloadToShopify({
                  id: item.id,
                  status: typeof item.status === "string" ? item.status : undefined,
                  inventory: item.inventory as unknown as AlegraInventoryPayload["inventory"],
                });
              }
              totalProcessed += 1;
              const updatedAt = extractUpdatedAt(item);
              if (updatedAt && updatedAt > lastSeen) {
                lastSeen = updatedAt;
              }
            })
          );
        }

        start += items.length;
        if (items.length < batchLimit) {
          keepGoing = false;
        }
      }

      if (totalProcessed > 0) {
        await saveSyncCheckpoint({
          entity: "products_sync",
          lastStart: lastSeen,
          total: totalProcessed,
        });
      }

      await createSyncLog({
        entity: "products_sync",
        direction: "alegra->shopify",
        status: "success",
        message: "Products sync batch completed",
        request: { processed: totalProcessed },
        response: { processed: totalProcessed },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Products sync poll failed";
      await createSyncLog({
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
  setInterval(run, intervalMs);
}
