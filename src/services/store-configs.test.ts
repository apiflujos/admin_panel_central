import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSettingsMock,
  getOrgIdMock,
  getPoolMock,
} = vi.hoisted(() => ({
  getSettingsMock: vi.fn(),
  getOrgIdMock: vi.fn(),
  getPoolMock: vi.fn(),
}));

vi.mock("./settings.service", () => ({
  getSettings: getSettingsMock,
}));

vi.mock("../db", () => ({
  getOrgId: getOrgIdMock,
  getPool: getPoolMock,
}));

vi.mock("../utils/crypto", () => ({
  decryptString: vi.fn(),
}));

describe("store-configs boolean normalization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getOrgIdMock.mockReturnValue("org_123");
    getSettingsMock.mockResolvedValue({
      rules: {
        publishOnStock: true,
        autoPublishOnWebhook: false,
        inventoryAdjustmentsEnabled: true,
        inventoryAdjustmentsAutoPublish: true,
        onlyActiveItems: false,
        warehouseIds: [],
      },
      invoice: {
        generateInvoice: false,
        applyPayment: false,
        einvoiceEnabled: false,
      },
    });
  });

  it("reads persisted string booleans without falling back to defaults", async () => {
    const queryMock = vi.fn().mockResolvedValue({
      rows: [
        {
          store_id: 10,
          store_name: "Oliva Shoes",
          shop_domain: "olivashoes.myshopify.com",
          access_token_encrypted: null,
          alegra_account_id: 2,
          transfer_destination_warehouse_id: "1",
          transfer_origin_warehouse_ids: "1,2",
          transfer_priority_warehouse_id: null,
          transfer_strategy: "manual",
          price_list_general_id: null,
          price_list_discount_id: null,
          price_list_wholesale_id: null,
          currency: "COP",
          config_json: {
            rules: {
              syncEnabled: "false",
              publishOnStock: "false",
              createInShopify: "true",
              updateInShopify: "false",
              includeImages: "false",
              trackInventory: "true",
              allowOversell: "false",
              onlyActiveItems: "true",
              webhookItemsEnabled: "false",
              autoPublishOnWebhook: "true",
              inventoryAdjustmentsEnabled: "false",
              inventoryAdjustmentsAutoPublish: "false",
              warehouseIds: ["8"],
            },
            invoice: {
              generateInvoice: "true",
              applyPayment: "false",
              einvoiceEnabled: "true",
            },
            sync: {
              contacts: {
                enabled: "false",
                fromShopify: "false",
                fromAlegra: "true",
                createInAlegra: "false",
                createInShopify: "true",
              },
              orders: {
                shopifyEnabled: "false",
                alegraEnabled: "true",
                shopifyToAlegra: "off",
                alegraToShopify: "draft",
              },
              products: {
                shopifyEnabled: "true",
                createInAlegra: "false",
                updateInAlegra: "false",
                includeInventory: "true",
                warehouseId: "9",
                matchPriority: "barcode_sku",
              },
            },
          },
          config_id: 99,
        },
      ],
    });
    getPoolMock.mockReturnValue({ query: queryMock });

    const { listStoreConfigs } = await import("./store-configs.service");
    const [result] = await listStoreConfigs();

    expect(result.rules.syncEnabled).toBe(false);
    expect(result.rules.publishOnStock).toBe(false);
    expect(result.rules.updateInShopify).toBe(false);
    expect(result.rules.onlyActiveItems).toBe(true);
    expect(result.rules.webhookItemsEnabled).toBe(false);
    expect(result.rules.autoPublishOnWebhook).toBe(true);
    expect(result.rules.inventoryAdjustmentsEnabled).toBe(false);
    expect(result.rules.inventoryAdjustmentsAutoPublish).toBe(false);
    expect(result.invoice.generateInvoice).toBe(true);
    expect(result.invoice.applyPayment).toBe(false);
    expect(result.invoice.einvoiceEnabled).toBe(true);
    expect(result.sync.contacts.enabled).toBe(false);
    expect(result.sync.contacts.fromShopify).toBe(false);
    expect(result.sync.contacts.fromAlegra).toBe(true);
    expect(result.sync.contacts.createInAlegra).toBe(false);
    expect(result.sync.contacts.createInShopify).toBe(true);
    expect(result.sync.orders.shopifyEnabled).toBe(false);
    expect(result.sync.orders.alegraEnabled).toBe(true);
    expect(result.sync.products.shopifyEnabled).toBe(true);
    expect(result.sync.products.createInAlegra).toBe(false);
    expect(result.sync.products.updateInAlegra).toBe(false);
    expect(result.sync.products.includeInventory).toBe(true);
  });
});
