import {
  SUMMARY_WAREHOUSE_ALIASES,
  buildPreparedWorkbookSummary,
  mergeWorkbookStock,
  resolveWorkbookSelectedQuantity,
  resolveWorkbookWarehouseSelection,
} from "./xlsx-inventory";

describe("domain/xlsx-inventory", () => {
  const warehouseColumns = [
    {
      header: "Cantidad inicial en bodega: Bodega Granada",
      column: "AM",
      warehouse: "Bodega Granada",
    },
    {
      header: "Cantidad inicial en bodega: Bodega Holguines",
      column: "AP",
      warehouse: "Bodega Holguines",
    },
    {
      header: "Cantidad inicial en bodega: Bodega La Leyenda",
      column: "BB",
      warehouse: "Bodega La Leyenda",
    },
    {
      header: "Cantidad inicial en bodega: Bodega Barranquilla",
      column: "BE",
      warehouse: "Bodega Barranquilla",
    },
  ];

  const summaryColumns = SUMMARY_WAREHOUSE_ALIASES.map((item, index) => ({
    header: item.header,
    warehouse: item.warehouse,
    column: `X${index}`,
  }));

  it("resuelve la bodega compuesta de Shopify", () => {
    expect(resolveWorkbookWarehouseSelection("shopify", warehouseColumns, summaryColumns)).toEqual({
      warehouse: "Bodegas Shopify",
      header: "Bodegas Shopify",
      column: "",
      components: [
        "Bodega Granada",
        "Bodega Holguines",
        "Bodega La Leyenda",
        "Bodega Barranquilla",
      ],
    });
  });

  it("prioriza columnas resumen cuando existen", () => {
    expect(
      mergeWorkbookStock(
        warehouseColumns,
        {
          "Bodega Granada": 10,
          "Bodega Holguines": 0,
          "Bodega La Leyenda": 0,
          "Bodega Barranquilla": 0,
        },
        {
          "Bodega Granada": 2,
        }
      )
    ).toEqual({
      "Bodega Granada": 2,
      "Bodega Holguines": 0,
      "Bodega La Leyenda": 0,
      "Bodega Barranquilla": 0,
    });
  });

  it("suma correctamente la seleccion compuesta", () => {
    const selection = resolveWorkbookWarehouseSelection("Bodegas Shopify", warehouseColumns, summaryColumns);
    expect(
      resolveWorkbookSelectedQuantity(
        {
          "Bodega Granada": 1,
          "Bodega Holguines": 2,
          "Bodega La Leyenda": 3,
          "Bodega Barranquilla": 4,
        },
        selection
      )
    ).toBe(10);
  });

  it("construye resumen agregado del workbook", () => {
    const selection = resolveWorkbookWarehouseSelection("Bodegas Shopify", warehouseColumns, summaryColumns);
    expect(
      buildPreparedWorkbookSummary({
        sourceFile: "test.xlsx",
        sheet: "item",
        selection,
        warehouseColumns,
        totalSheetRows: 4,
        parentRows: 1,
        distinctReferences: 2,
        rows: [
          {
            rowNumber: 2,
            code: "A",
            name: "Prod / 35",
            parentName: "Prod",
            variantLabel: "35",
            reference: "REF1",
            visibleInStore: true,
            hasStockFlag: true,
            selectedWarehouse: "Bodegas Shopify",
            selectedQuantity: 1,
            totalQuantity: 1,
            prices: { priceWithVat: 100, discountPriceWithVat: 50, general: 0, discountBeforeVat: 0 },
            stockByWarehouse: { "Bodega Granada": 1 },
          },
          {
            rowNumber: 3,
            code: "B",
            name: "Prod / 36",
            parentName: "Prod",
            variantLabel: "36",
            reference: "REF2",
            visibleInStore: false,
            hasStockFlag: false,
            selectedWarehouse: "Bodegas Shopify",
            selectedQuantity: 0,
            totalQuantity: 0,
            prices: { priceWithVat: 100, discountPriceWithVat: 0, general: 0, discountBeforeVat: 0 },
            stockByWarehouse: { "Bodega Granada": 0 },
          },
        ],
      })
    ).toMatchObject({
      variantRows: 2,
      visibleVariants: 1,
      variantsWithSelectedStock: 1,
      readyForShopify: 1,
      readyForShopifyWithSelectedStock: 1,
    });
  });
});
