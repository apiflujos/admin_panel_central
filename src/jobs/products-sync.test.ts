import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  createSyncLogMock,
  syncAlegraInventoryPayloadToShopifyMock,
  syncAlegraItemPayloadToShopifyMock,
  upsertAlegraItemCacheIfTrackedMock,
  buildSyncContextMock,
  getSyncCheckpointMock,
  saveSyncCheckpointMock,
  listConnectedShopifyDomainsMock,
} = vi.hoisted(() => ({
  createSyncLogMock: vi.fn(),
  syncAlegraInventoryPayloadToShopifyMock: vi.fn(),
  syncAlegraItemPayloadToShopifyMock: vi.fn(),
  upsertAlegraItemCacheIfTrackedMock: vi.fn(),
  buildSyncContextMock: vi.fn(),
  getSyncCheckpointMock: vi.fn(),
  saveSyncCheckpointMock: vi.fn(),
  listConnectedShopifyDomainsMock: vi.fn(),
}));

vi.mock("../services/logs.service", () => ({
  createSyncLog: createSyncLogMock,
}));

vi.mock("../services/alegra-to-shopify.service", () => ({
  syncAlegraInventoryPayloadToShopify: syncAlegraInventoryPayloadToShopifyMock,
  syncAlegraItemPayloadToShopify: syncAlegraItemPayloadToShopifyMock,
}));

vi.mock("../services/alegra-items-cache.service", () => ({
  upsertAlegraItemCacheIfTracked: upsertAlegraItemCacheIfTrackedMock,
}));

vi.mock("../services/sync-context", () => ({
  buildSyncContext: buildSyncContextMock,
}));

vi.mock("../services/sync-checkpoints.service", () => ({
  getSyncCheckpoint: getSyncCheckpointMock,
  saveSyncCheckpoint: saveSyncCheckpointMock,
}));

vi.mock("../services/store-connections.service", () => ({
  listConnectedShopifyDomains: listConnectedShopifyDomainsMock,
}));

import { startProductsSyncPoller } from "./products-sync";

describe("products-sync poller", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-28T12:00:00.000Z"));
    vi.clearAllMocks();
    process.env.PRODUCTS_SYNC_POLL_SECONDS = "900";
    process.env.PRODUCTS_SYNC_BATCH_SIZE = "2";
    process.env.PRODUCTS_SYNC_BATCH_LIMIT = "30";
    process.env.PRODUCTS_SYNC_LOOKBACK_MINUTES = "180";
    listConnectedShopifyDomainsMock.mockResolvedValue([
      "disabled-store.myshopify.com",
      "olivashoes.myshopify.com",
    ]);
    getSyncCheckpointMock.mockImplementation(async (entity: string) => {
      if (entity === "products_sync:olivashoes.myshopify.com") {
        return {
          lastStart: Date.parse("2026-04-26T10:00:00.000Z"),
          total: 1,
        };
      }
      return null;
    });
    buildSyncContextMock
      .mockResolvedValueOnce({
        shopDomain: "disabled-store.myshopify.com",
        webhookItemsEnabled: false,
      })
      .mockResolvedValueOnce({
        shopDomain: "olivashoes.myshopify.com",
        webhookItemsEnabled: true,
        alegra: {
          listItemsUpdatedSince: vi
            .fn()
            .mockResolvedValueOnce({
              items: [
                {
                  id: "1",
                  status: "active",
                  updated_at: "2026-04-26T11:00:00.000Z",
                  inventory: { availableQuantity: 5 },
                },
                {
                  id: "2",
                  status: "active",
                  updated_at: "2026-04-26T12:00:00.000Z",
                },
              ],
            })
            .mockResolvedValueOnce({ items: [] }),
        },
      });
    upsertAlegraItemCacheIfTrackedMock.mockResolvedValue(undefined);
    syncAlegraItemPayloadToShopifyMock.mockResolvedValue(undefined);
    syncAlegraInventoryPayloadToShopifyMock.mockResolvedValue(undefined);
    saveSyncCheckpointMock.mockResolvedValue(undefined);
    createSyncLogMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.PRODUCTS_SYNC_POLL_SECONDS;
    delete process.env.PRODUCTS_SYNC_BATCH_SIZE;
    delete process.env.PRODUCTS_SYNC_BATCH_LIMIT;
    delete process.env.PRODUCTS_SYNC_LOOKBACK_MINUTES;
  });

  it("skips disabled stores and saves checkpoint for enabled stores after syncing batches", async () => {
    startProductsSyncPoller();

    await vi.waitFor(() => {
      expect(syncAlegraItemPayloadToShopifyMock).toHaveBeenCalledTimes(2);
    });

    expect(buildSyncContextMock).toHaveBeenNthCalledWith(1, "disabled-store.myshopify.com");
    expect(buildSyncContextMock).toHaveBeenNthCalledWith(2, "olivashoes.myshopify.com");
    expect(upsertAlegraItemCacheIfTrackedMock).toHaveBeenCalledTimes(2);
    expect(syncAlegraInventoryPayloadToShopifyMock).toHaveBeenCalledTimes(1);
    expect(syncAlegraInventoryPayloadToShopifyMock).toHaveBeenCalledWith(
      {
        id: "1",
        status: "active",
        inventory: { availableQuantity: 5 },
      },
      "olivashoes.myshopify.com"
    );
    expect(saveSyncCheckpointMock).toHaveBeenCalledWith({
      entity: "products_sync:olivashoes.myshopify.com",
      lastStart: Date.parse("2026-04-26T12:00:00.000Z"),
      total: 2,
    });
    expect(createSyncLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "products_sync",
        direction: "alegra->shopify",
        status: "success",
        request: { shopDomain: "olivashoes.myshopify.com", processed: 2 },
      })
    );
  });
});
