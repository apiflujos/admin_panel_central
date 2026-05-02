import { buildShopifyVariantIndex, planPreparedRowsForShopify } from "./shopify-publication";

describe("domain/shopify-publication", () => {
  it("arma un plan de publicacion con match, inventario y precio", () => {
    const rows = [
      {
        rowNumber: 2,
        code: "BEAB3C001435",
        name: "MERIDA - CAFE / 35",
        parentName: "MERIDA - CAFE",
        variantLabel: "35",
        reference: "BEAB3C0014",
        visibleInStore: true,
        hasStockFlag: true,
        selectedWarehouse: "Bodegas Shopify",
        selectedQuantity: 4,
        totalQuantity: 4,
        prices: {
          priceWithVat: 425000,
          discountPriceWithVat: 212500,
          general: 0,
          discountBeforeVat: 0,
        },
        stockByWarehouse: {
          "Bodega Granada": 2,
          "Bodega Holguines": 1,
          "Bodega Barranquilla": 1,
          "Bodega La Leyenda": 0,
        },
      },
    ];

    const products = [
      {
        id: "gid://shopify/Product/1",
        title: "Merida - Cafe",
        status: "ACTIVE",
        variants: {
          edges: [
            {
              node: {
                productId: "gid://shopify/Product/1",
                productTitle: "Merida - Cafe",
                productStatus: "ACTIVE",
                variantId: "gid://shopify/ProductVariant/1",
                variantTitle: "35",
                sku: "BEAB3C001435",
                barcode: "",
                selectedOptions: ["35"],
                inventoryItemId: "gid://shopify/InventoryItem/1",
                price: "425000.00",
                compareAtPrice: null,
                inventoryQuantity: 0,
              },
            },
          ],
        },
      },
    ];

    const plan = planPreparedRowsForShopify(rows, buildShopifyVariantIndex(products));
    expect(plan).toMatchObject({
      consideredRows: 1,
      matchedRows: 1,
      unmatchedRows: 0,
      inventoryUpdatesNeeded: 1,
      priceUpdatesNeeded: 1,
    });
    expect(plan.matched[0]).toMatchObject({
      desiredPrice: "212500.00",
      desiredCompareAtPrice: "425000.00",
      strategy: "sku_exact",
    });
  });

  it("marca unmatched cuando no encuentra variante", () => {
    const plan = planPreparedRowsForShopify(
      [
        {
          rowNumber: 2,
          code: "X",
          name: "TEST / 35",
          parentName: "TEST",
          variantLabel: "35",
          reference: "REFTEST",
          visibleInStore: true,
          hasStockFlag: true,
          selectedWarehouse: "Bodegas Shopify",
          selectedQuantity: 1,
          totalQuantity: 1,
          prices: {
            priceWithVat: 100,
            discountPriceWithVat: 0,
            general: 0,
            discountBeforeVat: 0,
          },
          stockByWarehouse: { "Bodega Granada": 1 },
        },
      ],
      buildShopifyVariantIndex([])
    );
    expect(plan.unmatchedRows).toBe(1);
    expect(plan.unmatched[0].reason).toBe("unmatched");
  });
});
