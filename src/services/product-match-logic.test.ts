import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  getMappingByShopifyIdMock,
  getMappingByAlegraIdMock,
  getMappingByShopifyInventoryItemIdMock,
  saveMappingMock,
  updateMappingMetadataMock,
  createSyncLogMock,
  getStoreConfigForDomainMock,
  buildSyncContextMock,
  isWorkerEnabledMock,
} = vi.hoisted(() => ({
  getMappingByShopifyIdMock: vi.fn(),
  getMappingByAlegraIdMock: vi.fn(),
  getMappingByShopifyInventoryItemIdMock: vi.fn(),
  saveMappingMock: vi.fn(),
  updateMappingMetadataMock: vi.fn(),
  createSyncLogMock: vi.fn(),
  getStoreConfigForDomainMock: vi.fn(),
  buildSyncContextMock: vi.fn(),
  isWorkerEnabledMock: vi.fn(),
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

// `withVariantCreateLock` toma un advisory lock de Postgres antes de crear el
// ítem. Sin este simulacro la prueba muere con "DATABASE_URL is required": el
// candado se añadió después de escribirse la prueba y nadie la actualizó.
vi.mock("../db", () => ({
  getPool: () => ({
    connect: async () => ({
      query: async () => ({ rows: [] }),
      release: () => undefined,
    }),
  }),
}));

// Las escrituras de catálogo consultan el interruptor de Super Admin.
vi.mock("./worker-settings.service", () => ({
  isWorkerEnabled: isWorkerEnabledMock,
}));

describe("product match logic", () => {
  // `ALLOW_ALEGRA_ITEM_WRITES` esta APAGADO por omision: escribir items de
  // Alegra desde Shopify colapsaba el stock. Esta prueba mide el emparejamiento,
  // que ocurre despues del kill switch, asi que lo enciende explicitamente y lo
  // devuelve a su sitio al terminar.
  const killSwitchOriginal = process.env.ALLOW_ALEGRA_ITEM_WRITES;
  afterEach(() => {
    if (killSwitchOriginal === undefined) delete process.env.ALLOW_ALEGRA_ITEM_WRITES;
    else process.env.ALLOW_ALEGRA_ITEM_WRITES = killSwitchOriginal;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ALLOW_ALEGRA_ITEM_WRITES = "true";
    isWorkerEnabledMock.mockResolvedValue(true);
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
    // Lo prohibido es emparejar por el codigo de barras DE LA VARIANTE
    // ("BAR-999"): es un identificador distinto del SKU y produce
    // emparejamientos falsos. Buscar el VALOR del SKU dentro del campo
    // `barcode` de Alegra si es legitimo -- muchas cuentas guardan ahi el SKU.
    const serializado = JSON.stringify(attemptedParams);
    expect(serializado).not.toContain("BAR-999");
    expect(attemptedParams.every((params) => params.barcode !== "BAR-999")).toBe(true);
    expect(attemptedParams.some((params) => params.reference === "SKU-123")).toBe(true);
    expect(result).toMatchObject({
      ok: false,
      skipped: true,
      reason: "create_disabled",
      identifier: "SKU-123",
    });
  }, 30000);

  it("con el kill switch APAGADO no se escribe nada en Alegra", async () => {
    process.env.ALLOW_ALEGRA_ITEM_WRITES = "false";
    const alegraCtx = { alegra: { searchItems: vi.fn().mockResolvedValue({ items: [] }) } };
    const { syncShopifyVariantToAlegra } = await import("./shopify-products-to-alegra-items.service");

    const result = await syncShopifyVariantToAlegra({
      ctx: alegraCtx as never,
      shopDomain: "olivashoes.myshopify.com",
      product: { id: "gid://shopify/Product/1", title: "Zapato" },
      variant: {
        id: "gid://shopify/ProductVariant/1",
        title: "Default Title",
        sku: "SKU-123",
        price: "100",
        inventoryQuantity: 5,
      } as never,
      config: {
        enabled: true,
        createInAlegra: true,
        updateInAlegra: true,
        includeInventory: true,
        warehouseId: undefined,
        matchPriority: ["sku"],
      },
    });

    expect(result).toMatchObject({ ok: false, skipped: true, reason: "alegra_writes_disabled" });
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

  it("con el interruptor de existencias APAGADO no se consulta ni se toca Shopify", async () => {
    // El webhook `inventory.updated` de Alegra llega por `webhook-dispatch`,
    // que está encendido para poder facturar. Sin este freno, apagar la
    // sincronización en Super Admin no impediría que ese webhook cambiara las
    // existencias de la tienda.
    isWorkerEnabledMock.mockResolvedValue(false);
    const ctx = {
      shopDomain: "olivashoes.myshopify.com",
      storeId: 1,
      alegraWarehouseIds: [],
      updateInShopify: true,
      syncEnabled: true,
      shopify: {
        findVariantBySku: vi.fn(),
        findVariantByIdentifier: vi.fn(),
        setInventoryOnHand: vi.fn(),
        updateProductStatus: vi.fn(),
      },
      alegra: { getItem: vi.fn() },
    };
    buildSyncContextMock.mockResolvedValue(ctx);

    const { syncAlegraInventoryPayloadToShopify } = await import("./alegra-to-shopify.service");
    const result = await syncAlegraInventoryPayloadToShopify(
      { id: "2001", inventory: { availableQuantity: 3 } },
      "olivashoes.myshopify.com"
    );

    expect(isWorkerEnabledMock).toHaveBeenCalledWith("inventory-adjustments");
    expect(result).toMatchObject({ skipped: true, reason: "inventory_writes_disabled" });
    expect(ctx.shopify.setInventoryOnHand).not.toHaveBeenCalled();
    expect(ctx.shopify.updateProductStatus).not.toHaveBeenCalled();
    expect(ctx.shopify.findVariantBySku).not.toHaveBeenCalled();
    expect(ctx.shopify.findVariantByIdentifier).not.toHaveBeenCalled();
  });
});
