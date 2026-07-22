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

type AlegraItemRow = Record<string, unknown> & {
  id?: string | number;
  inventory?: Record<string, unknown>;
  status?: string;
};

const toIso = (value: number) => new Date(value).toISOString();
const checkpointKey = (shopDomain: string) => `products_sync:${shopDomain}`;

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

  const batchSize = Math.max(1, Math.min(Number(process.env.PRODUCTS_SYNC_BATCH_SIZE || 5), 20));
  const batchLimit = Math.max(10, Math.min(Number(process.env.PRODUCTS_SYNC_BATCH_LIMIT || 30), 30));
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
              if (result.status === "rejected") {
                hadFailure = true;
                const failedAt = extractUpdatedAt(batch[idx]);
                if (failedAt != null) {
                  minFailedUpdatedAt = minFailedUpdatedAt == null ? failedAt : Math.min(minFailedUpdatedAt, failedAt);
                }
                console.error(
                  `[products-sync] item failed`,
                  { shopDomain: ctx.shopDomain, itemId: batch[idx]?.id },
                  result.reason
                );
              }
            });
          }

          start += items.length;
          if (items.length < batchLimit) keepGoing = false;
        }

        if (totalProcessed > 0) {
          const checkpointValue =
            hadFailure && minFailedUpdatedAt != null
              ? Math.max(sinceMs, minFailedUpdatedAt - 1)
              : lastSeen;
          await saveSyncCheckpoint({
            entity: checkpointKey(ctx.shopDomain),
            lastStart: checkpointValue,
            total: totalProcessed,
          });
        }

        await safeCreateSyncLog({
          entity: "products_sync",
          direction: "alegra->shopify",
          status: hadFailure ? "fail" : "success",
          message: hadFailure ? "Products sync batch completed with failures" : "Products sync batch completed",
          request: { shopDomain: ctx.shopDomain, processed: totalProcessed },
          response: { shopDomain: ctx.shopDomain, processed: totalProcessed },
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
