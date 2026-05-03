import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getAlegraCredentialMock,
  getAlegraConnectionByDomainMock,
  syncAlegraInventoryByIdMock,
  getAlegraBaseUrlMock,
} = vi.hoisted(() => ({
  getAlegraCredentialMock: vi.fn(),
  getAlegraConnectionByDomainMock: vi.fn(),
  syncAlegraInventoryByIdMock: vi.fn(),
  getAlegraBaseUrlMock: vi.fn(),
}));

vi.mock("./settings.service", () => ({
  getAlegraCredential: getAlegraCredentialMock,
}));

vi.mock("./store-connections.service", () => ({
  getAlegraConnectionByDomain: getAlegraConnectionByDomainMock,
}));

vi.mock("./alegra-to-shopify.service", () => ({
  syncAlegraInventoryById: syncAlegraInventoryByIdMock,
}));

vi.mock("../utils/alegra-env", () => ({
  getAlegraBaseUrl: getAlegraBaseUrlMock,
}));

describe("inventory-adjustments.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAlegraCredentialMock.mockResolvedValue({
      email: "legacy@example.com",
      apiKey: "legacy-key",
      environment: "prod",
    });
    getAlegraConnectionByDomainMock.mockResolvedValue({
      email: "store@example.com",
      apiKey: "store-key",
      environment: "prod",
    });
    getAlegraBaseUrlMock.mockReturnValue("https://api.alegra.test");
    syncAlegraInventoryByIdMock.mockResolvedValue({ handled: true });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            {
              id: "adj-1",
              items: [{ id: "1001" }, { id: "1002" }],
            },
          ],
        }),
      })
    );
  });

  it("preserves shopDomain when autopublishing inventory adjustments", async () => {
    const { syncInventoryAdjustments } = await import("./inventory-adjustments.service");
    const query = new URLSearchParams();
    query.set("date", "2026-04-28");

    const result = await syncInventoryAdjustments(query, {
      autoPublish: true,
      shopDomain: "olivashoes.myshopify.com",
    });

    expect(getAlegraConnectionByDomainMock).toHaveBeenCalledWith("olivashoes.myshopify.com");
    expect(syncAlegraInventoryByIdMock).toHaveBeenNthCalledWith(1, "1001", "olivashoes.myshopify.com");
    expect(syncAlegraInventoryByIdMock).toHaveBeenNthCalledWith(2, "1002", "olivashoes.myshopify.com");
    expect(result).toEqual({
      adjustmentsCount: 1,
      itemCount: 2,
      synced: 2,
      failed: 0,
      autoPublish: true,
    });
  }, 30000);
});
