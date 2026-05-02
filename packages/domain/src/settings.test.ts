import {
  buildProviderDetail,
  summarizeConnectionHealth,
  toConnectionStatus,
  toConnectionStatusListDto,
  toSettingsOverviewDto,
} from "./settings";

describe("domain/settings", () => {
  it("resuelve estados de conexión", () => {
    expect(toConnectionStatus({ connected: true })).toBe("connected");
    expect(toConnectionStatus({ needsReconnect: true })).toBe("attention");
    expect(toConnectionStatus({})).toBe("disconnected");
    expect(buildProviderDetail({ connected: true }, "OK", "RECONNECT")).toBe("OK");
  });

  it("mapea overview y resume conexiones", () => {
    expect(
      toSettingsOverviewDto({
        companyName: "Oliva Shoes",
        moduleCount: 8,
        activeConnections: 4,
        pendingActions: 1,
      })
    ).toEqual({
      companyName: "Oliva Shoes",
      moduleCount: 8,
      activeConnections: 4,
      pendingActions: 1,
    });

    expect(
      toConnectionStatusListDto([
        { key: "1", label: "Shopify", provider: "shopify", status: "connected", detail: "OK" },
        { key: "2", label: "Alegra", provider: "alegra", status: "attention", detail: "Reconnect" },
        { key: "3", label: "Meta", provider: "meta_ads", status: "disconnected", detail: "Off" },
      ])
    ).toEqual({
      items: [
        { key: "1", label: "Shopify", provider: "shopify", status: "connected", detail: "OK" },
        { key: "2", label: "Alegra", provider: "alegra", status: "attention", detail: "Reconnect" },
        { key: "3", label: "Meta", provider: "meta_ads", status: "disconnected", detail: "Off" },
      ],
      summary: {
        total: 3,
        connectedCount: 1,
        attentionCount: 1,
        disconnectedCount: 1,
      },
    });
  });

  it("resume salud de conexiones desde stores y canales globales", () => {
    expect(
      summarizeConnectionHealth({
        storesCatalog: [
          {
            shopify: { shopifyConnected: true, shopifyNeedsReconnect: false },
            alegra: { needsReconnect: false },
            woo: { ok: false },
          },
          {
            shopify: { shopifyConnected: false, shopifyNeedsReconnect: true },
          },
        ],
        googleAds: { connected: true },
        metaAds: { needsReconnect: true },
        tiktokAds: {},
      })
    ).toEqual({
      activeConnections: 3,
      pendingActions: 4,
    });
  });
});
