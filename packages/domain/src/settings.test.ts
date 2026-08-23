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
      // Activas (3): tienda 1 Shopify + tienda 1 Alegra + Google Ads.
      activeConnections: 3,
      // Pendientes (3): Woo caido de la tienda 1 + Shopify a reconectar de la
      // tienda 2 + Meta Ads a reconectar. Esta cifra nacio en 4 por un error
      // de cuentas de quien escribio la prueba: la implementacion nunca
      // devolvio 4 y no ha cambiado desde que se introdujo.
      pendingActions: 3,
    });
  });

  it("una tienda SIN Alegra no cuenta como pendiente: es que no la usa", () => {
    // Ausencia != averia. Lo que falta por configurar se dice en la matriz de
    // automatizacion con su motivo; este contador es solo para averias
    // declaradas, para no reportar el mismo problema dos veces.
    expect(
      summarizeConnectionHealth({
        storesCatalog: [{ shopify: { shopifyConnected: true, shopifyNeedsReconnect: false } }],
      })
    ).toEqual({ activeConnections: 1, pendingActions: 0 });
  });

  it("cuenta una averia por cada conexion declarada que la tenga", () => {
    expect(
      summarizeConnectionHealth({
        storesCatalog: [
          {
            shopify: { shopifyConnected: false, shopifyNeedsReconnect: true },
            alegra: { needsReconnect: true },
            woo: { ok: false },
          },
        ],
        googleAds: { needsReconnect: true },
        metaAds: { needsReconnect: true },
        tiktokAds: { needsReconnect: true },
      })
    ).toEqual({ activeConnections: 0, pendingActions: 6 });
  });
});
