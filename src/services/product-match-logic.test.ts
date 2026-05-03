import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getMappingByShopifyIdMock,
  getMappingByAlegraIdMock,
  getMappingByShopifyInventoryItemIdMock,
  saveMappingMock,
  updateMappingMetadataMock,
  createSyncLogMock,
  getStoreConfigForDomainMock,
  buildSyncContextMock,
} = vi.hoisted(() => ({
  getMappingByShopifyIdMock: vi.fn(),
  getMappingByAlegraIdMock: vi.fn(),
  getMappingByShopifyInventoryItemIdMock: vi.fn(),
  saveMappingMock: vi.fn(),
  updateMappingMetadataMock: vi.fn(),
  createSyncLogMock: vi.fn(),
  getStoreConfigForDomainMock: vi.fn(),
  buildSyncContextMock: vi.fn(),
}));

vi.mock("./mapping.service", () => ({
  getMappingByShopifyId: getMappingByShopifyIdMock,
  getMappingByAlegraId: getMappingByAlegraIdMock,
  getMappingByShopifyInventoryItemId: getMappingByShopifyInventoryItemIdMock,
  saveMapping: saveMappingMock,
  updateMappingMetadata: updateMappingMetadataMock,
}));

vi.mock("./logs.service", () => ({
  createSyncLog: createSyncLogMock,
}));

vi.mock("./store-configs.service", () => ({
  getStoreConfigForDomain: getStoreConfigForDomainMock,
}));

vi.mock("./sync-context", () => ({
  buildSyncContext: buildSyncContextMock,
}));

vi.mock("./products.service", () => ({
  upsertProduct: vi.fn(),
}));

describe("product match logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMappingByShopifyIdMock.mockResolvedValue(undefined);
    getMappingByAlegraIdMock.mockResolvedValue(undefined);
    getMappingByShopifyInventoryItemIdMock.mockResolvedValue(undefined);
    saveMappingMock.mockResolvedValue(undefined);
    updateMappingMetadataMock.mockResolvedValue(undefined);
    createSyncLogMock.mockResolvedValue(undefined);
    getStoreConfigForDomainMock.mockResolvedValue(null);
  });

  it("matches Shopify -> Alegra using SKU/reference without barcode fallbacks", async () => {
    const alegraCtx = {
      alegra: {
        searchItems: vi.fn().mockResolvedValue({ items: [] }),
      },
    };
    const { syncShopifyVariantToAlegra } = await import("./shopify-products-to-alegra-items.service");

    const result = await syncShopifyVariantToAlegra({
      ctx: alegraCtx as never,
      shopDomain: "olivashoes.myshopify.com",
      product: { id: "gid://shopify/Product/1", title: "Zapato" },
      variant: {
        id: "gid://shopify/ProductVariant/1",
        title: "Default Title",
        sku: "SKU-123",
        barcode: "BAR-999",
        price: "100",
        inventoryQuantity: 5,
      } as never,
      config: {
        enabled: true,
        createInAlegra: false,
        updateInAlegra: true,
        includeInventory: false,
        warehouseId: undefined,
        matchPriority: ["sku"],
      },
    });

    expect(alegraCtx.alegra.searchItems).toHaveBeenCalled();
    const attemptedParams = alegraCtx.alegra.searchItems.mock.calls.map((call) => call[0]);
    expect(attemptedParams.every((params) => !("barcode" in params) && String(params.query || "").indexOf("barcode:") === -1)).toBe(true);
    expect(attemptedParams.some((params) => params.reference === "SKU-123")).toBe(true);
    expect(result).toMatchObject({
      ok: false,
      skipped: true,
      reason: "create_disabled",
      identifier: "SKU-123",
    });
  }, 30000);

  it("matches Alegra -> Shopify using exact SKU first and broader identifier fallback", async () => {
    const shopifyCtx = {
      shopDomain: "olivashoes.myshopify.com",
      shopifyLocationId: "gid://shopify/Location/1",
      updateInShopify: true,
      syncEnabled: true,
      autoPublishOnWebhook: false,
      publishOnStock: true,
      autoPublishStatus: "draft",
      onlyActiveItems: false,
      alegraWarehouseIds: [],
      shopify: {
        findVariantBySku: vi.fn().mockResolvedValue({
          productVariants: {
            edges: [],
          },
        }),
        findVariantByIdentifier: vi.fn().mockResolvedValue({
          productVariants: {
            edges: [],
          },
        }),
      },
      alegra: {
        getItem: vi.fn().mockResolvedValue({
          id: "2001",
          reference: "REF-2001",
          barcode: "BAR-2001",
          inventory: { availableQuantity: 3 },
        }),
      },
    };
    buildSyncContextMock.mockResolvedValue(shopifyCtx);

    const { syncAlegraInventoryPayloadToShopify } = await import("./alegra-to-shopify.service");
    const result = await syncAlegraInventoryPayloadToShopify(
      {
        id: "2001",
        inventory: { availableQuantity: 3 },
      },
      "olivashoes.myshopify.com"
    );

    expect(shopifyCtx.shopify.findVariantBySku).toHaveBeenCalledWith("REF-2001");
    expect(shopifyCtx.shopify.findVariantByIdentifier).toHaveBeenCalledWith("REF-2001");
    expect(shopifyCtx.shopify.findVariantByIdentifier).toHaveBeenCalledWith("BAR-2001");
    expect(result).toMatchObject({
      handled: false,
      reason: "missing_mapping",
    });
  }, 30000);
});
