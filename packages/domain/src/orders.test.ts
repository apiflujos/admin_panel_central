import { normalizeOrdersListFilters, toAdminWebOrdersListDto } from "./orders";

describe("domain/orders", () => {
  it("normaliza filtros de pedidos", () => {
    expect(
      normalizeOrdersListFilters({
        shopDomain: " tienda.myshopify.com ",
        query: " #1001 ",
        date: "2026-05-01",
        days: "7",
        sort: "order_desc",
        limit: "25",
        offset: "5",
      })
    ).toEqual({
      shopDomain: "tienda.myshopify.com",
      query: "#1001",
      date: "2026-05-01",
      days: 7,
      sort: "order_desc",
      limit: 25,
      offset: 5,
    });
  });

  it("mapea pedidos y resume estados", () => {
    expect(
      toAdminWebOrdersListDto({
        result: {
          items: [
            {
              shopify_order_id: "1",
              shopify_order_number: "#1001",
              customer_name: "Ana",
              products_summary: "Sandalia",
              alegra_status: "facturado",
              invoice_number: "F-1",
              processed_at: "2026-05-01T10:00:00.000Z",
            },
            {
              shopify_order_id: "2",
              shopify_order_number: "#1002",
              customer_email: "leo@example.com",
              products_summary: "Bota",
            },
          ],
          total: 2,
          limit: 20,
          offset: 0,
        },
        getOverride: (id) => (id === "2" ? { einvoiceRequested: true } : null),
        getMissing: (id) => (id === "2" ? ["email", "address"] : []),
        einvoiceEnabled: true,
      })
    ).toMatchObject({
      total: 2,
      limit: 20,
      offset: 0,
      summary: {
        invoicedCount: 1,
        pendingCount: 1,
        einvoicePendingCount: 1,
      },
    });
  });
});
