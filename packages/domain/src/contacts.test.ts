import { normalizeContactsListFilters, toAdminWebContactsListDto } from "./contacts";

describe("domain/contacts", () => {
  it("normaliza filtros de listado", () => {
    expect(
      normalizeContactsListFilters({
        query: " cliente ",
        status: " synced ",
        source: "shopify",
        limit: "25",
        offset: "5",
        shopDomain: " tienda.myshopify.com ",
      })
    ).toEqual({
      query: "cliente",
      status: "synced",
      source: "shopify",
      limit: 25,
      offset: 5,
      shopDomain: "tienda.myshopify.com",
    });
  });

  it("mapea contactos al dto de admin-web", () => {
    expect(
      toAdminWebContactsListDto({
        items: [
          {
            id: 7,
            name: "Ana Ruiz",
            email: "ana@example.com",
            phone: "3001234567",
            doc: "123",
            source: "shopify",
            sync_status: "synced",
            updated_at: "2026-05-01T10:00:00.000Z",
          },
        ],
        total: 1,
        limit: 20,
        offset: 0,
      })
    ).toEqual({
      items: [
        {
          id: 7,
          name: "Ana Ruiz",
          email: "ana@example.com",
          phone: "3001234567",
          document: "123",
          source: "shopify",
          syncStatus: "synced",
          updatedAt: "2026-05-01T10:00:00.000Z",
        },
      ],
      total: 1,
      limit: 20,
      offset: 0,
    });
  });
});
