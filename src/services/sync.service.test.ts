import { beforeEach, describe, expect, it, vi } from "vitest";

const syncAlegraInventoryPayloadToShopifyMock = vi.fn();
const syncAlegraItemPayloadToShopifyMock = vi.fn();
const upsertAlegraItemCacheIfTrackedMock = vi.fn();
const syncShopifyOrderToAlegraMock = vi.fn();
const createInventoryAdjustmentFromRefundMock = vi.fn();
const createSyncLogMock = vi.fn();
const updateSyncLogMock = vi.fn();
const buildSyncContextMock = vi.fn();
const upsertProductMock = vi.fn();
const getMappingByShopifyIdMock = vi.fn();
const getMappingByShopifyInventoryItemIdMock = vi.fn();
const updateMappingMetadataMock = vi.fn();
const resolveStoreConfigMock = vi.fn();
const syncAlegraInvoiceToShopifyFromWebhookMock = vi.fn();
const syncShopifyInventoryLevelToAlegraMock = vi.fn();
const syncShopifyProductToAlegraFromWebhookMock = vi.fn();
const ensureOrganizationMock = vi.fn();
const ensureWebhookEventsTableMock = vi.fn();
const getOrgIdMock = vi.fn();
const getPoolMock = vi.fn();
let clientQueryMock: ReturnType<typeof vi.fn>;
let poolQueryMock: ReturnType<typeof vi.fn>;

vi.mock("./alegra-to-shopify.service", () => ({
  syncAlegraInventoryPayloadToShopify: syncAlegraInventoryPayloadToShopifyMock,
  syncAlegraItemPayloadToShopify: syncAlegraItemPayloadToShopifyMock,
}));

vi.mock("./alegra-items-cache.service", () => ({
  upsertAlegraItemCacheIfTracked: upsertAlegraItemCacheIfTrackedMock,
}));

vi.mock("./shopify-to-alegra.service", () => ({
  syncShopifyOrderToAlegra: syncShopifyOrderToAlegraMock,
  createInventoryAdjustmentFromRefund: createInventoryAdjustmentFromRefundMock,
}));

vi.mock("./logs.service", () => ({
  createSyncLog: createSyncLogMock,
  updateSyncLog: updateSyncLogMock,
}));

vi.mock("./idempotency.service", () => ({
  acquireIdempotencyKey: async () => ({ status: "processing" as const, acquired: true }),
  markIdempotencyKey: async () => undefined,
}));

vi.mock("./sync-context", () => ({
  buildSyncContext: buildSyncContextMock,
}));

vi.mock("./products.service", () => ({
  upsertProduct: upsertProductMock,
}));

vi.mock("./mapping.service", () => ({
  getMappingByShopifyId: getMappingByShopifyIdMock,
  getMappingByShopifyInventoryItemId: getMappingByShopifyInventoryItemIdMock,
  updateMappingMetadata: updateMappingMetadataMock,
}));

vi.mock("./store-config.service", () => ({
  resolveStoreConfig: resolveStoreConfigMock,
}));

vi.mock("./alegra-invoices-to-shopify-orders.service", () => ({
  syncAlegraInvoiceToShopifyFromWebhook: syncAlegraInvoiceToShopifyFromWebhookMock,
}));

vi.mock("./shopify-products-to-alegra-items.service", () => ({
  syncShopifyInventoryLevelToAlegra: syncShopifyInventoryLevelToAlegraMock,
  syncShopifyProductToAlegraFromWebhook: syncShopifyProductToAlegraFromWebhookMock,
}));

vi.mock("../db", () => ({
  ensureOrganization: ensureOrganizationMock,
  ensureWebhookEventsTable: ensureWebhookEventsTableMock,
  getOrgId: getOrgIdMock,
  getPool: getPoolMock,
}));

const publishWebhookEventMock = vi.fn();
vi.mock("./webhook-queue", () => ({
  publishWebhookEvent: publishWebhookEventMock,
}));

describe("sync.service webhook flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clientQueryMock = vi.fn();
    poolQueryMock = vi.fn();
    getOrgIdMock.mockReturnValue("org-1");
    getPoolMock.mockReturnValue({
      connect: vi.fn().mockResolvedValue({
        query: clientQueryMock,
        release: vi.fn(),
      }),
      query: poolQueryMock,
    });
    ensureOrganizationMock.mockResolvedValue(undefined);
    ensureWebhookEventsTableMock.mockResolvedValue(undefined);
    syncShopifyOrderToAlegraMock.mockResolvedValue({ invoiceId: "A1" });
    syncShopifyInventoryLevelToAlegraMock.mockResolvedValue({ adjusted: true });
    syncShopifyProductToAlegraFromWebhookMock.mockResolvedValue({ synced: true });
    upsertProductMock.mockResolvedValue(undefined);
    createSyncLogMock.mockResolvedValue(1);
    updateSyncLogMock.mockResolvedValue(undefined);
    getMappingByShopifyInventoryItemIdMock.mockResolvedValue(null);
    getMappingByShopifyIdMock.mockResolvedValue(null);
    updateMappingMetadataMock.mockResolvedValue(undefined);
    resolveStoreConfigMock.mockResolvedValue({ syncOrdersAlegraToShopify: "draft" });
    syncAlegraInvoiceToShopifyFromWebhookMock.mockResolvedValue({ created: true });
  });

  it("routes Shopify orders/paid webhooks through the order sync flow", async () => {
    const { processShopifyWebhook } = await import("./sync.service");
    const payload = { id: 123, __shopDomain: "olivashoes.myshopify.com" };

    const result = await processShopifyWebhook("orders/paid", payload);

    expect(syncShopifyOrderToAlegraMock).toHaveBeenCalledWith(payload);
    expect(result).toEqual({
      handled: true,
      type: "order",
      result: { invoiceId: "A1" },
    });
  }, 30000);

  it("syncs Shopify inventory webhooks to Alegra and updates local product cache", async () => {
    getMappingByShopifyInventoryItemIdMock.mockResolvedValue({
      alegraId: "44",
      shopifyId: "gid://shopify/ProductVariant/9",
      shopifyProductId: "gid://shopify/Product/7",
    });

    const { processShopifyWebhook } = await import("./sync.service");
    const result = await processShopifyWebhook("inventory_levels/update", {
      __shopDomain: "olivashoes.myshopify.com",
      inventory_item_id: "777",
      available: 12,
      updated_at: "2026-04-27T16:00:00Z",
    });

    expect(upsertProductMock).toHaveBeenCalledWith({
      shopDomain: "olivashoes.myshopify.com",
      shopifyId: "gid://shopify/Product/7",
      inventoryQuantity: 12,
      source: "shopify",
      sourceUpdatedAt: "2026-04-27T16:00:00Z",
    });
    expect(syncShopifyInventoryLevelToAlegraMock).toHaveBeenCalledWith({
      shopDomain: "olivashoes.myshopify.com",
      inventoryItemId: "777",
      available: 12,
    });
    expect(result).toEqual({
      handled: true,
      type: "inventory",
      inventoryItemId: "777",
      available: 12,
      syncToAlegra: { adjusted: true },
    });
  }, 15000);

  it("returns missing_inventory_payload for invalid Shopify inventory webhooks", async () => {
    const { processShopifyWebhook } = await import("./sync.service");
    const result = await processShopifyWebhook("inventory_levels/update", {
      __shopDomain: "olivashoes.myshopify.com",
      inventory_item_id: "",
      available: "NaN",
    });

    expect(syncShopifyInventoryLevelToAlegraMock).not.toHaveBeenCalled();
    expect(upsertProductMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      handled: false,
      reason: "missing_inventory_payload",
    });
  });

  it("warns and skips Shopify inventory webhooks when no mapping exists", async () => {
    getMappingByShopifyInventoryItemIdMock.mockResolvedValue(null);

    const { processShopifyWebhook } = await import("./sync.service");
    const result = await processShopifyWebhook("inventory_levels/update", {
      __shopDomain: "olivashoes.myshopify.com",
      inventory_item_id: "999",
      available: 4,
    });

    expect(createSyncLogMock).toHaveBeenCalledWith({
      entity: "inventory",
      direction: "shopify->alegra",
      status: "warn",
      message: "Inventory webhook without mapping",
      request: { inventoryItemId: "999" },
    });
    expect(syncShopifyInventoryLevelToAlegraMock).not.toHaveBeenCalled();
    expect(upsertProductMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      handled: false,
      reason: "missing_mapping",
    });
  });

  const webhookEvent = {
    source: "shopify" as const,
    eventType: "orders/create",
    payload: { id: 999, __shopDomain: "olivashoes.myshopify.com" },
    meta: { shopDomain: "olivashoes.myshopify.com" },
  };

  it("camino rápido: registra el evento y lo despacha por Redis sin tocar retry_queue", async () => {
    // El registro en webhook_events es un único INSERT contra el pool, sin
    // transacción: es lo que quita presión al pool en el camino caliente.
    poolQueryMock.mockResolvedValueOnce({ rows: [{ id: 101 }] });
    publishWebhookEventMock.mockResolvedValueOnce(true);

    const { enqueueWebhookEvent } = await import("./sync.service");
    const result = await enqueueWebhookEvent(webhookEvent);

    expect(poolQueryMock).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO webhook_events"), [
      "org-1",
      "shopify",
      "orders/create",
      webhookEvent.payload,
    ]);
    expect(publishWebhookEventMock).toHaveBeenCalledWith({
      webhookEventId: 101,
      orgId: "org-1",
      event: webhookEvent,
    });
    // Nada de transacción ni de retry_queue cuando Redis acepta el job.
    expect(clientQueryMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: "queued",
      event: webhookEvent,
      syncLogId: null,
      webhookEventId: 101,
    });
  });

  it("respaldo: si Redis no acepta el job, cae a sync_logs + retry_queue sin duplicar la fila", async () => {
    poolQueryMock.mockResolvedValueOnce({ rows: [{ id: 101 }] });
    publishWebhookEventMock.mockResolvedValueOnce(false);
    clientQueryMock
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 202 }] }) // INSERT sync_logs
      .mockResolvedValueOnce(undefined) // INSERT retry_queue
      .mockResolvedValueOnce(undefined); // COMMIT

    const { enqueueWebhookEvent } = await import("./sync.service");
    const result = await enqueueWebhookEvent(webhookEvent);

    expect(ensureOrganizationMock).toHaveBeenCalled();
    expect(ensureWebhookEventsTableMock).toHaveBeenCalled();
    expect(clientQueryMock).toHaveBeenNthCalledWith(1, "BEGIN");
    // La fila de webhook_events ya existe: el respaldo NO debe reinsertarla.
    expect(clientQueryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("INSERT INTO sync_logs"),
      expect.arrayContaining(["org-1", "order", "shopify->alegra", "Order webhook processed"])
    );
    expect(clientQueryMock).toHaveBeenNthCalledWith(3, expect.stringContaining("INSERT INTO retry_queue"), [202]);
    expect(clientQueryMock).toHaveBeenNthCalledWith(4, "COMMIT");
    expect(result).toEqual({
      status: "queued",
      event: webhookEvent,
      syncLogId: 202,
      webhookEventId: 101,
    });
  });

  it("respaldo: si ni siquiera se pudo registrar la fila, inserta webhook_events en la transacción", async () => {
    poolQueryMock.mockRejectedValueOnce(new Error("pool agotado"));
    clientQueryMock
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 101 }] }) // INSERT webhook_events
      .mockResolvedValueOnce({ rows: [{ id: 202 }] }) // INSERT sync_logs
      .mockResolvedValueOnce(undefined) // INSERT retry_queue
      .mockResolvedValueOnce(undefined); // COMMIT

    const { enqueueWebhookEvent } = await import("./sync.service");
    const result = await enqueueWebhookEvent(webhookEvent);

    expect(publishWebhookEventMock).not.toHaveBeenCalled();
    expect(clientQueryMock).toHaveBeenNthCalledWith(2, expect.stringContaining("INSERT INTO webhook_events"), [
      "org-1",
      "shopify",
      "orders/create",
      webhookEvent.payload,
    ]);
    expect(result).toEqual({
      status: "queued",
      event: webhookEvent,
      syncLogId: 202,
      webhookEventId: 101,
    });
  });
});
