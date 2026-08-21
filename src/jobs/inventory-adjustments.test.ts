import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  syncInventoryAdjustmentsMock,
  createSyncLogMock,
  getInventoryAdjustmentsSettingsMock,
  getSyncCheckpointMock,
  saveSyncCheckpointMock,
  getStoreConfigForDomainMock,
  listConnectedShopifyDomainsMock,
  isWorkerEnabledMock,
} = vi.hoisted(() => ({
  syncInventoryAdjustmentsMock: vi.fn(),
  createSyncLogMock: vi.fn(),
  getInventoryAdjustmentsSettingsMock: vi.fn(),
  getSyncCheckpointMock: vi.fn(),
  saveSyncCheckpointMock: vi.fn(),
  getStoreConfigForDomainMock: vi.fn(),
  listConnectedShopifyDomainsMock: vi.fn(),
  isWorkerEnabledMock: vi.fn(),
}));

vi.mock("../services/inventory-adjustments.service", () => ({
  syncInventoryAdjustments: syncInventoryAdjustmentsMock,
}));

vi.mock("../services/logs.service", () => ({
  createSyncLog: createSyncLogMock,
}));

vi.mock("../services/settings.service", () => ({
  getInventoryAdjustmentsSettings: getInventoryAdjustmentsSettingsMock,
}));

vi.mock("../services/sync-checkpoints.service", () => ({
  getSyncCheckpoint: getSyncCheckpointMock,
  saveSyncCheckpoint: saveSyncCheckpointMock,
}));

vi.mock("../services/store-configs.service", () => ({
  getStoreConfigForDomain: getStoreConfigForDomainMock,
}));

vi.mock("../services/store-connections.service", () => ({
  listConnectedShopifyDomains: listConnectedShopifyDomainsMock,
}));

// El poller consulta su interruptor de Super Admin en cada pasada.
vi.mock("../services/worker-settings.service", () => ({
  isWorkerEnabled: isWorkerEnabledMock,
}));

vi.mock("../services/organizations.service", () => ({
  withEachOrganization: async (fn: (orgId: number) => Promise<void>) => {
    await fn(1);
  },
}));

import { startInventoryAdjustmentsPoller } from "./inventory-adjustments";

describe("inventory-adjustments poller", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-28T12:00:00.000Z"));
    vi.clearAllMocks();
    isWorkerEnabledMock.mockResolvedValue(true);
    getInventoryAdjustmentsSettingsMock.mockResolvedValue({
      enabled: true,
      intervalMinutes: 30,
      autoPublish: true,
    });
    listConnectedShopifyDomainsMock.mockResolvedValue(["olivashoes.myshopify.com"]);
    getStoreConfigForDomainMock.mockResolvedValue({
      rules: {
        inventoryAdjustmentsEnabled: true,
        inventoryAdjustmentsAutoPublish: false,
      },
    });
    getSyncCheckpointMock.mockResolvedValue({
      lastStart: Date.parse("2026-04-26T00:00:00.000Z"),
      total: null,
    });
    syncInventoryAdjustmentsMock.mockResolvedValue({ ok: true });
    saveSyncCheckpointMock.mockResolvedValue(undefined);
    createSyncLogMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("replays pending dates per shop domain using the checkpoint and store rules", async () => {
    startInventoryAdjustmentsPoller();

    await vi.waitFor(() => {
      expect(syncInventoryAdjustmentsMock).toHaveBeenCalledTimes(3);
    });

    expect(syncInventoryAdjustmentsMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        get: expect.any(Function),
      }),
      {
        autoPublish: false,
        shopDomain: "olivashoes.myshopify.com",
      }
    );
    expect(syncInventoryAdjustmentsMock.mock.calls[0][0].get("date")).toBe("2026-04-26");
    expect(syncInventoryAdjustmentsMock.mock.calls[1][0].get("date")).toBe("2026-04-27");
    expect(syncInventoryAdjustmentsMock.mock.calls[2][0].get("date")).toBe("2026-04-28");

    expect(saveSyncCheckpointMock).toHaveBeenNthCalledWith(1, {
      entity: "inventory_adjustments:olivashoes.myshopify.com",
      lastStart: Date.parse("2026-04-26T00:00:00.000Z"),
      total: null,
    });
    expect(saveSyncCheckpointMock).toHaveBeenNthCalledWith(3, {
      entity: "inventory_adjustments:olivashoes.myshopify.com",
      lastStart: Date.parse("2026-04-28T00:00:00.000Z"),
      total: null,
    });
    expect(createSyncLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "inventory_adjustments",
        direction: "alegra->shopify",
        status: "success",
      })
    );
  });
});
