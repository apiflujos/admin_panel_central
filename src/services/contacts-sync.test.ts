import { beforeEach, describe, expect, it, vi } from "vitest";

const buildSyncContextMock = vi.fn();
const resolveStoreConfigMock = vi.fn();
const getMappingByAlegraIdMock = vi.fn();
const getMappingByShopifyIdMock = vi.fn();
const saveMappingMock = vi.fn();
const upsertContactMock = vi.fn();

vi.mock("./sync-context", () => ({
  buildSyncContext: buildSyncContextMock,
}));

vi.mock("./store-config.service", () => ({
  resolveStoreConfig: resolveStoreConfigMock,
}));

vi.mock("./mapping.service", () => ({
  getMappingByAlegraId: getMappingByAlegraIdMock,
  getMappingByShopifyId: getMappingByShopifyIdMock,
  saveMapping: saveMappingMock,
}));

vi.mock("./contacts.service", () => ({
  upsertContact: upsertContactMock,
}));

describe("contacts-sync document matching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveStoreConfigMock.mockResolvedValue({
      contactMatchPriority: ["document", "phone", "email"],
      syncContactsFromShopify: true,
      syncContactsFromAlegra: true,
      syncContactsCreateInAlegra: true,
      syncContactsCreateInShopify: true,
    });
    getMappingByAlegraIdMock.mockResolvedValue(null);
    getMappingByShopifyIdMock.mockResolvedValue(null);
    saveMappingMock.mockResolvedValue(undefined);
    upsertContactMock.mockResolvedValue(undefined);
  });

  it("syncs an Alegra contact to an existing Shopify customer matched by DOC note", async () => {
    const shopifyCustomer = {
      id: "gid://shopify/Customer/1",
      email: null,
      firstName: "Ana",
      lastName: "Perez",
      phone: null,
      note: "DOC:123456",
      defaultAddress: null,
    };
    const updateCustomer = vi.fn().mockResolvedValue(shopifyCustomer);
    buildSyncContextMock.mockResolvedValue({
      shopDomain: "olivashoes.myshopify.com",
      shopify: {
        searchCustomers: vi.fn().mockResolvedValue([]),
        listAllCustomers: vi.fn().mockResolvedValue([shopifyCustomer]),
        updateCustomer,
        createCustomer: vi.fn(),
      },
      alegra: {
        getContact: vi.fn().mockResolvedValue({
          id: "99",
          name: "Ana Perez",
          identification: "123456",
        }),
      },
    });

    const { syncSingleContact } = await import("./contacts-sync.service");
    const result = await syncSingleContact({
      source: "alegra",
      identifier: "99",
      shopDomain: "olivashoes.myshopify.com",
    });

    expect(result).toEqual({ synced: true, shopifyCustomerId: "gid://shopify/Customer/1" });
    expect(updateCustomer).toHaveBeenCalledWith(
      "gid://shopify/Customer/1",
      expect.objectContaining({
        note: "DOC:123456",
      })
    );
    expect(saveMappingMock).toHaveBeenCalledWith({
      entity: "contact",
      shopifyId: "gid://shopify/Customer/1",
      alegraId: "99",
    });
  }, 15000);

  it("syncs a Shopify customer with only DOC note into Alegra without skipping", async () => {
    const createContact = vi.fn().mockResolvedValue({ id: "501" });
    buildSyncContextMock.mockResolvedValue({
      shopDomain: "olivashoes.myshopify.com",
      shopify: {
        getCustomerById: vi.fn().mockResolvedValue({
          customer: {
            id: "gid://shopify/Customer/2",
            email: null,
            firstName: "Luis",
            lastName: "Diaz",
            phone: null,
            note: "DOC: 900123456-1",
            defaultAddress: null,
          },
        }),
      },
      alegra: {
        findContactByEmail: vi.fn().mockResolvedValue([]),
        listContacts: vi.fn().mockResolvedValue([]),
        createContact,
        updateContact: vi.fn(),
      },
    });

    const { syncSingleContact } = await import("./contacts-sync.service");
    const result = await syncSingleContact({
      source: "shopify",
      identifier: "gid://shopify/Customer/2",
      shopDomain: "olivashoes.myshopify.com",
    });

    expect(result).toEqual({ synced: true, alegraContactId: "501" });
    expect(createContact).toHaveBeenCalledWith(
      expect.objectContaining({
        identification: "9001234561",
      })
    );
    expect(upsertContactMock).toHaveBeenCalledWith(
      expect.objectContaining({
        shopifyId: "gid://shopify/Customer/2",
        alegraId: "501",
        doc: "9001234561",
      })
    );
  }, 15000);

  it("finds a Shopify customer by document identifier when phone search does not match", async () => {
    const shopifyCustomer = {
      id: "gid://shopify/Customer/3",
      email: null,
      firstName: "Marta",
      lastName: "Lopez",
      phone: null,
      note: "Cliente mayorista DOC: CC800900100",
      defaultAddress: null,
    };
    const updateContact = vi.fn().mockResolvedValue(undefined);
    const searchCustomers = vi.fn().mockResolvedValue([]);
    const listAllCustomers = vi.fn().mockResolvedValue([shopifyCustomer]);
    buildSyncContextMock.mockResolvedValue({
      shopDomain: "olivashoes.myshopify.com",
      shopify: {
        searchCustomers,
        listAllCustomers,
        updateCustomer: vi.fn(),
        createCustomer: vi.fn(),
      },
      alegra: {
        updateContact,
        createContact: vi.fn(),
        findContactByEmail: vi.fn().mockResolvedValue([]),
        listContacts: vi.fn().mockResolvedValue([{ id: "3", identification: "CC800900100" }]),
      },
    });

    const { syncSingleContact } = await import("./contacts-sync.service");
    const result = await syncSingleContact({
      source: "shopify",
      identifier: "CC800900100",
      shopDomain: "olivashoes.myshopify.com",
    });

    expect(result).toEqual({ synced: true, alegraContactId: "3" });
    expect(searchCustomers).not.toHaveBeenCalled();
    expect(listAllCustomers).toHaveBeenCalledWith(500);
    expect(updateContact).toHaveBeenCalledWith(
      "3",
      expect.objectContaining({
        identification: "CC800900100",
      })
    );
  });

  it("falls back from numeric Shopify customer id lookup to document matching", async () => {
    const shopifyCustomer = {
      id: "gid://shopify/Customer/4",
      email: null,
      firstName: "Nora",
      lastName: "Gomez",
      phone: null,
      note: "DOC:900123456",
      defaultAddress: null,
    };
    const createContact = vi.fn().mockResolvedValue({ id: "504" });
    buildSyncContextMock.mockResolvedValue({
      shopDomain: "olivashoes.myshopify.com",
      shopify: {
        getCustomerById: vi.fn().mockResolvedValue({ customer: null }),
        searchCustomers: vi.fn().mockResolvedValue([]),
        listAllCustomers: vi.fn().mockResolvedValue([shopifyCustomer]),
      },
      alegra: {
        findContactByEmail: vi.fn().mockResolvedValue([]),
        listContacts: vi.fn().mockResolvedValue([]),
        createContact,
        updateContact: vi.fn(),
      },
    });

    const { syncSingleContact } = await import("./contacts-sync.service");
    const result = await syncSingleContact({
      source: "shopify",
      identifier: "900123456",
      shopDomain: "olivashoes.myshopify.com",
    });

    expect(result).toEqual({ synced: true, alegraContactId: "504" });
    expect(createContact).toHaveBeenCalledWith(
      expect.objectContaining({
        identification: "900123456",
      })
    );
  });

  it("falls back from numeric Alegra contact id lookup to document matching", async () => {
    const updateCustomer = vi.fn().mockResolvedValue(undefined);
    buildSyncContextMock.mockResolvedValue({
      shopDomain: "olivashoes.myshopify.com",
      shopify: {
        searchCustomers: vi.fn().mockResolvedValue([]),
        listAllCustomers: vi.fn().mockResolvedValue([
          {
            id: "gid://shopify/Customer/5",
            email: null,
            firstName: "Pablo",
            lastName: "Rios",
            phone: null,
            note: "DOC:700111222",
            defaultAddress: null,
          },
        ]),
        updateCustomer,
        createCustomer: vi.fn(),
      },
      alegra: {
        getContact: vi.fn().mockResolvedValue(null),
        findContactByEmail: vi.fn().mockResolvedValue([]),
        listContacts: vi.fn().mockResolvedValue([{ id: "88", identification: "700111222", name: "Pablo Rios" }]),
      },
    });

    const { syncSingleContact } = await import("./contacts-sync.service");
    const result = await syncSingleContact({
      source: "alegra",
      identifier: "700111222",
      shopDomain: "olivashoes.myshopify.com",
    });

    expect(result).toEqual({ synced: true, shopifyCustomerId: "gid://shopify/Customer/5" });
    expect(updateCustomer).toHaveBeenCalledWith(
      "gid://shopify/Customer/5",
      expect.objectContaining({
        note: "DOC:700111222",
      })
    );
  });

  it("skips bulk Shopify->Alegra sync when the direction is disabled and force is off", async () => {
    resolveStoreConfigMock.mockResolvedValue({
      contactMatchPriority: ["document", "phone", "email"],
      syncContactsFromShopify: false,
      syncContactsFromAlegra: true,
      syncContactsCreateInAlegra: true,
      syncContactsCreateInShopify: true,
    });
    buildSyncContextMock.mockResolvedValue({
      shopDomain: "olivashoes.myshopify.com",
      shopify: {
        listAllCustomers: vi.fn(),
        listAllCustomersByQuery: vi.fn(),
      },
      alegra: {
        listContacts: vi.fn(),
      },
    });

    const { syncContactsBulk } = await import("./contacts-sync.service");
    const result = await syncContactsBulk({
      direction: "shopify_to_alegra",
      shopDomain: "olivashoes.myshopify.com",
      limit: 25,
    });

    expect(result).toEqual({ skipped: true, reason: "sync_disabled" });
  });

  it("allows bulk Alegra->Shopify sync with force even when the direction is disabled", async () => {
    const createCustomer = vi.fn().mockResolvedValue({ id: "gid://shopify/Customer/55" });
    resolveStoreConfigMock.mockResolvedValue({
      contactMatchPriority: ["document", "phone", "email"],
      syncContactsFromShopify: true,
      syncContactsFromAlegra: false,
      syncContactsCreateInAlegra: true,
      syncContactsCreateInShopify: true,
    });
    buildSyncContextMock.mockResolvedValue({
      shopDomain: "olivashoes.myshopify.com",
      shopify: {
        searchCustomers: vi.fn().mockResolvedValue([]),
        listAllCustomers: vi.fn().mockResolvedValue([]),
        createCustomer,
        updateCustomer: vi.fn(),
      },
      alegra: {
        listContacts: vi
          .fn()
          .mockResolvedValueOnce([
            {
              id: "88",
              name: "Carlos Ruiz",
              identification: "CC12345",
              email: "carlos@example.com",
            },
          ])
          .mockResolvedValueOnce([]),
      },
    });

    const { syncContactsBulk } = await import("./contacts-sync.service");
    const result = await syncContactsBulk({
      direction: "alegra_to_shopify",
      shopDomain: "olivashoes.myshopify.com",
      limit: 10,
      force: true,
    });

    expect(result).toEqual({
      total: 1,
      processed: 1,
      synced: 1,
      skipped: 0,
      failed: 0,
    });
    expect(createCustomer).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "carlos@example.com",
        note: "DOC:CC12345",
      })
    );
  });
});
