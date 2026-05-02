import { normalizeProductsListFilters, toAdminWebProductsListDto } from "./products";

describe("domain/products", () => {
  it("normaliza filtros de productos", () => {
    expect(
      normalizeProductsListFilters({
        start: "5",
        limit: "25",
        query: " REF-1 ",
        shopDomain: " tienda.myshopify.com ",
        inStockOnly: "true",
        warehouseIds: "1, 2 ,3",
      })
    ).toEqual({
      offset: 5,
      limit: 25,
      query: "REF-1",
      shopDomain: "tienda.myshopify.com",
      inStockOnly: true,
      warehouseIds: ["1", "2", "3"],
    });
  });

  it("mapea productos y resume match/stock", () => {
    expect(
      toAdminWebProductsListDto({
        items: [
          {
            id: 1,
            alegra_item_id: "A1",
            shopify_product_id: "S1",
            name: "Producto 1",
            reference: "REF-1",
            sku: "SKU-1",
            inventory_quantity: 3,
            source: "alegra",
            updated_at: "2026-05-01T10:00:00.000Z",
          },
          {
            id: 2,
            alegra_item_id: "A2",
            name: "Producto 2",
            reference: "REF-2",
            sku: "SKU-2",
            inventory_quantity: 0,
          },
        ],
        total: 2,
        limit: 30,
        offset: 0,
      })
    ).toMatchObject({
      total: 2,
      summary: {
        matchedCount: 1,
        pendingCount: 1,
        inStockCount: 1,
      },
    });
  });
});
