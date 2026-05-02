import { normalizeMarketingDashboardFilters, toAdminWebMarketingOverviewDto } from "./marketing";

describe("domain/marketing", () => {
  it("normaliza filtros del dashboard de marketing", () => {
    const result = normalizeMarketingDashboardFilters({
      shopDomain: " https://tienda.myshopify.com/products ",
      from: "2026-04-01",
      to: "2026-04-30",
    });

    expect(result).toEqual({
      shopDomain: "tienda.myshopify.com",
      from: "2026-04-01",
      to: "2026-04-30",
    });
  });

  it("mapea el dashboard al dto de admin-web", () => {
    expect(
      toAdminWebMarketingOverviewDto({
        shopDomain: "tienda.myshopify.com",
        from: "2026-04-01",
        to: "2026-04-30",
        kpis: {
          revenue: 1000,
          spend: 250,
          roas: 4,
          paidOrders: 10,
          aov: 100,
          customersNew: 6,
          customersRepeat: 4,
          funnel: {
            sessions: 500,
            addToCart: 50,
            checkouts: 20,
          },
        },
        byChannel: [{ channel: "meta", revenue: 700, paidOrders: 7, sessions: 300, roas: 3.5 }],
        topCampaigns: [{ utmCampaign: "abril", revenue: 500, paidOrders: 5, roas: 5 }],
      })
    ).toEqual({
      shopDomain: "tienda.myshopify.com",
      from: "2026-04-01",
      to: "2026-04-30",
      revenue: 1000,
      spend: 250,
      roas: 4,
      paidOrders: 10,
      aov: 100,
      customersNew: 6,
      customersRepeat: 4,
      sessions: 500,
      addToCart: 50,
      checkouts: 20,
      byChannel: [{ channel: "meta", revenue: 700, paidOrders: 7, sessions: 300, roas: 3.5 }],
      topCampaigns: [{ utmCampaign: "abril", revenue: 500, paidOrders: 5, roas: 5 }],
    });
  });
});
