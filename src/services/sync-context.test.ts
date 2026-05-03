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
    getPoolMock.mockReturnValue({
      query: vi
        .fn()
        .mockResolvedValueOnce({
          rows: [
            {
              shop_domain: "olivashoes.myshopify.com",
              access_token_encrypted: "enc-shop",
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              alegra_account_id: 99,
              user_email: "store@example.com",
              api_key_encrypted: "enc-alegra",
              environment: "prod",
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ warehouse_id: "12" }],
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
