import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  createSyncLogMock,
  mapOrderToPayloadMock,
  syncShopifyOrderToAlegraMock,
  getSyncCheckpointMock,
  saveSyncCheckpointMock,
  getShopifyConnectionByDomainMock,
  listConnectedShopifyDomainsMock,
  listAllOrdersByQueryMock,
  isWorkerEnabledMock,
  puedeCorrerEnTiendaMock,
} = vi.hoisted(() => ({
  createSyncLogMock: vi.fn(),
  mapOrderToPayloadMock: vi.fn(),
  syncShopifyOrderToAlegraMock: vi.fn(),
  getSyncCheckpointMock: vi.fn(),
  saveSyncCheckpointMock: vi.fn(),
  getShopifyConnectionByDomainMock: vi.fn(),
  listConnectedShopifyDomainsMock: vi.fn(),
  listAllOrdersByQueryMock: vi.fn(),
  isWorkerEnabledMock: vi.fn(),
  puedeCorrerEnTiendaMock: vi.fn(),
}));

vi.mock("../connectors/shopify", () => ({
  ShopifyClient: class {
    listAllOrdersByQuery = listAllOrdersByQueryMock;
  },
}));

vi.mock("../services/logs.service", () => ({
  createSyncLog: createSyncLogMock,
}));

vi.mock("../services/operations.service", () => ({
  mapOrderToPayload: mapOrderToPayloadMock,
}));

vi.mock("../services/shopify-to-alegra.service", () => ({
  syncShopifyOrderToAlegra: syncShopifyOrderToAlegraMock,
}));

vi.mock("../services/sync-checkpoints.service", () => ({
  getSyncCheckpoint: getSyncCheckpointMock,
  saveSyncCheckpoint: saveSyncCheckpointMock,
}));

vi.mock("../services/store-connections.service", () => ({
  getShopifyConnectionByDomain: getShopifyConnectionByDomainMock,
  listConnectedShopifyDomains: listConnectedShopifyDomainsMock,
}));

// El poller consulta su interruptor de Super Admin en cada pasada.
vi.mock("../services/worker-settings.service", () => ({
  isWorkerEnabled: isWorkerEnabledMock,
}));

// El poller comprueba los requisitos de la tienda antes de lanzar la tarea.
vi.mock("../services/requisitos-worker.service", () => ({
  puedeCorrerEnTienda: puedeCorrerEnTiendaMock,
}));

vi.mock("../services/organizations.service", () => ({
  withEachOrganization: async (fn: (orgId: number) => Promise<void>) => {
    await fn(1);
  },
}));

import { startOrdersSyncPoller } from "./orders-sync";

describe("orders-sync poller", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-28T12:00:00.000Z"));
    vi.clearAllMocks();
    isWorkerEnabledMock.mockResolvedValue(true);
    puedeCorrerEnTiendaMock.mockResolvedValue({ puedeCorrer: true, faltantes: [] });
    process.env.ORDERS_SYNC_POLL_SECONDS = "300";
    process.env.ORDERS_SYNC_BATCH_SIZE = "2";
    process.env.ORDERS_SYNC_MAX_ORDERS = "0";
    process.env.ORDERS_SYNC_LOOKBACK_MINUTES = "180";
    listConnectedShopifyDomainsMock.mockResolvedValue(["olivashoes.myshopify.com"]);
    getShopifyConnectionByDomainMock.mockResolvedValue({
      shopDomain: "olivashoes.myshopify.com",
      accessToken: "token",
    });
    // Dentro de la ventana de lookback (180 min desde las 12:00): asi la
    // consulta arranca en el CHECKPOINT y no en el suelo de tiempo.
    getSyncCheckpointMock.mockResolvedValue({
      lastStart: Date.parse("2026-04-28T11:00:00.000Z"),
      total: 2,
    });
    listAllOrdersByQueryMock.mockResolvedValue([
      {
        id: "2",
        name: "#1002",
        updatedAt: "2026-04-28T11:40:00.000Z",
        processedAt: "2026-04-28T11:40:00.000Z",
      },
      {
        id: "1",
        name: "#1001",
        updatedAt: "2026-04-28T11:30:00.000Z",
        processedAt: "2026-04-28T11:30:00.000Z",
      },
    ]);
    mapOrderToPayloadMock.mockImplementation((order) => ({
      id: order.id,
      name: order.name,
    }));
    syncShopifyOrderToAlegraMock.mockResolvedValue({ handled: true });
    saveSyncCheckpointMock.mockResolvedValue(undefined);
    createSyncLogMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.ORDERS_SYNC_POLL_SECONDS;
    delete process.env.ORDERS_SYNC_BATCH_SIZE;
    delete process.env.ORDERS_SYNC_MAX_ORDERS;
    delete process.env.ORDERS_SYNC_LOOKBACK_MINUTES;
  });

  it("polls orders per shop domain from the checkpoint and saves the latest updatedAt", async () => {
    startOrdersSyncPoller();

    await vi.waitFor(() => {
      expect(syncShopifyOrderToAlegraMock).toHaveBeenCalledTimes(2);
    });

    expect(listAllOrdersByQueryMock).toHaveBeenCalledWith(
      "status:any updated_at:>='2026-04-28T11:00:00.000Z'",
      undefined
    );
    expect(syncShopifyOrderToAlegraMock).toHaveBeenNthCalledWith(1, {
      id: "1",
      name: "#1001",
      __shopDomain: "olivashoes.myshopify.com",
    });
    expect(syncShopifyOrderToAlegraMock).toHaveBeenNthCalledWith(2, {
      id: "2",
      name: "#1002",
      __shopDomain: "olivashoes.myshopify.com",
    });
    expect(saveSyncCheckpointMock).toHaveBeenCalledWith({
      entity: "orders_sync:olivashoes.myshopify.com",
      lastStart: Date.parse("2026-04-28T11:40:00.000Z"),
      total: 2,
    });
    expect(createSyncLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "orders_sync",
        direction: "shopify->alegra",
        status: "success",
      })
    );
  });

  it("un checkpoint viejo NO hace consultar mas atras que la ventana de lookback", async () => {
    // Sin este tope, un pedido que falla siempre (sin cedula, sin match) ancla
    // el checkpoint en su `updatedAt` y el poller lo reprocesa en cada tick para
    // siempre. El suelo corta ese churn.
    getSyncCheckpointMock.mockResolvedValue({
      lastStart: Date.parse("2026-04-26T10:00:00.000Z"),
      total: 2,
    });

    startOrdersSyncPoller();

    await vi.waitFor(() => {
      expect(listAllOrdersByQueryMock).toHaveBeenCalled();
    });

    const consulta = String(listAllOrdersByQueryMock.mock.calls[0][0]);
    const desde = Date.parse(consulta.replace(/^.*>='/, "").replace(/'$/, ""));
    // 12:00 menos 180 min = 09:00. Nunca antes de eso, pese al checkpoint del dia 26.
    expect(desde).toBeGreaterThanOrEqual(Date.parse("2026-04-28T09:00:00.000Z"));
    expect(desde).toBeLessThan(Date.parse("2026-04-28T09:01:00.000Z"));
  });
});
