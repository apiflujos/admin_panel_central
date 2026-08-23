import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  decryptStringMock,
  ensureInventoryRulesColumnsMock,
  getOrgIdMock,
  getPoolMock,
  resolveStoreConfigMock,
  getStoreConfigForDomainMock,
  getPrimaryLocationIdMock,
} = vi.hoisted(() => ({
  decryptStringMock: vi.fn(),
  ensureInventoryRulesColumnsMock: vi.fn(),
  getOrgIdMock: vi.fn(),
  getPoolMock: vi.fn(),
  resolveStoreConfigMock: vi.fn(),
  getStoreConfigForDomainMock: vi.fn(),
  getPrimaryLocationIdMock: vi.fn(),
}));

vi.mock("../utils/crypto", () => ({
  decryptString: decryptStringMock,
}));

vi.mock("../db", () => ({
  ensureInventoryRulesColumns: ensureInventoryRulesColumnsMock,
  getOrgId: getOrgIdMock,
  getPool: getPoolMock,
}));

vi.mock("./store-config.service", () => ({
  resolveStoreConfig: resolveStoreConfigMock,
}));

vi.mock("./store-configs.service", () => ({
  getStoreConfigForDomain: getStoreConfigForDomainMock,
}));

vi.mock("../connectors/shopify", () => ({
  ShopifyClient: class {
    getPrimaryLocationId = getPrimaryLocationIdMock;
  },
}));

vi.mock("../connectors/alegra", () => ({
  AlegraClient: class {},
}));

describe("sync-context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getOrgIdMock.mockReturnValue(42);
    ensureInventoryRulesColumnsMock.mockResolvedValue(undefined);
    resolveStoreConfigMock.mockResolvedValue({});
    getStoreConfigForDomainMock.mockResolvedValue({
      rules: {
        syncEnabled: true,
        createInShopify: true,
        updateInShopify: true,
        publishOnStock: true,
        includeImages: true,
        trackInventory: true,
        allowOversell: false,
        onlyActiveItems: false,
        autoPublishOnWebhook: false,
        autoPublishStatus: "draft",
        webhookItemsEnabled: true,
        inventoryAdjustmentsEnabled: true,
        inventoryAdjustmentsAutoPublish: true,
        warehouseIds: ["8"],
      },
    });
    decryptStringMock
      .mockReturnValueOnce(JSON.stringify({ accessToken: "shop-token" }))
      .mockReturnValueOnce(JSON.stringify({ apiKey: "alegra-key" }));
    getPrimaryLocationIdMock.mockResolvedValue("gid://shopify/Location/1");
    // Se responde SEGÚN LA CONSULTA, no por orden de llamada.
    //
    // Antes era una cadena de `mockResolvedValueOnce`: al añadirse una cuarta
    // consulta al código (la del `store_id`), la cadena se quedó corta y
    // devolvía undefined. Con el despacho por texto, añadir una consulta nueva
    // no rompe la prueba.
    getPoolMock.mockReturnValue({
      query: vi.fn(async (sql: string) => {
        // ORDEN POR ESPECIFICIDAD: las dos consultas van a `shopify_stores`,
        // así que la del token se comprueba ANTES que la del store_id.
        if (/access_token_encrypted/i.test(sql)) {
          return {
            rows: [{ shop_domain: "olivashoes.myshopify.com", access_token_encrypted: "enc-shop" }],
          };
        }
        if (/api_key_encrypted/i.test(sql)) {
          return {
            rows: [
              {
                alegra_account_id: 99,
                user_email: "store@example.com",
                api_key_encrypted: "enc-alegra",
                environment: "prod",
              },
            ],
          };
        }
        if (/SELECT store_id/i.test(sql)) return { rows: [{ store_id: 7 }] };
        if (/warehouse_id/i.test(sql)) return { rows: [{ warehouse_id: "12" }] };
        return { rows: [] };
      }),
    });
  });

  it("falls back to Shopify primary location when the stored token has no locationId", async () => {
    const { buildSyncContext } = await import("./sync-context");

    const ctx = await buildSyncContext("olivashoes.myshopify.com");

    expect(getPrimaryLocationIdMock).toHaveBeenCalled();
    expect(ctx.shopDomain).toBe("olivashoes.myshopify.com");
    expect(ctx.shopifyLocationId).toBe("gid://shopify/Location/1");
    expect(ctx.alegraWarehouseId).toBe("12");
  }, 30000);
});
