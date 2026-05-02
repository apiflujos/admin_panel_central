import { normalizeInvoicesListFilters, toAdminWebInvoicesListDto } from "./invoices";

describe("domain/invoices", () => {
  it("normaliza filtros de facturas", () => {
    expect(
      normalizeInvoicesListFilters({
        shopDomain: " tienda.myshopify.com ",
        query: " FAC-1 ",
        date: "2026-05-01",
        days: "15",
        sort: "order_desc",
        limit: "30",
        offset: "5",
      })
    ).toEqual({
      shopDomain: "tienda.myshopify.com",
      query: "FAC-1",
      date: "2026-05-01",
      days: 15,
      sort: "order_desc",
      limit: 30,
      offset: 5,
    });
  });

  it("mapea facturas al dto de admin-web", () => {
    expect(
      toAdminWebInvoicesListDto({
        items: [
          {
            alegra_invoice_id: "INV-1",
            invoice_number: "F001-10",
            processed_at: "2026-05-01T12:00:00.000Z",
            customer_name: "Cliente Uno",
            total: 125000,
            currency: "COP",
            alegra_status: "paid",
          },
        ],
        total: 1,
        limit: 20,
        offset: 0,
      })
    ).toEqual({
      items: [
        {
          id: "INV-1",
          invoiceId: "INV-1",
          invoiceNumber: "F001-10",
          processedAt: "2026-05-01T12:00:00.000Z",
          customer: "Cliente Uno",
          total: 125000,
          currency: "COP",
          status: "paid",
        },
      ],
      total: 1,
      limit: 20,
      offset: 0,
    });
  });
});
