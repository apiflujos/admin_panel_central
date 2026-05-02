import type {
  PreparedInventoryWorkbookRow,
  PreparedInventoryWorkbookSummary,
  WorkbookWarehouseColumn,
  WorkbookWarehouseSelection,
} from "../../shared/src";
import { resolveSelectedInventoryQuantity, SHOPIFY_WAREHOUSE_COMPONENTS, SHOPIFY_WAREHOUSE_NAME } from "./inventory";

export const SUMMARY_WAREHOUSE_ALIASES = [
  { header: "Granada", warehouse: "Bodega Granada" },
  { header: "Leyenda", warehouse: "Bodega La Leyenda" },
  { header: "Barranquilla", warehouse: "Bodega Barranquilla" },
  { header: "Holguines", warehouse: "Bodega Holguines" },
] as const;

const SHOPIFY_WORKBOOK_LABELS = new Set([
  "bodegas shopify",
  "shopify",
  "granada+holguines+la leyenda+barranquilla",
  "granada+holguines+leyenda+barranquilla",
]);

export function resolveWorkbookWarehouseSelection(
  requestedWarehouse: string,
  warehouseColumns: WorkbookWarehouseColumn[],
  summaryColumns: WorkbookWarehouseColumn[]
): WorkbookWarehouseSelection {
  const normalized = String(requestedWarehouse || "").trim().toLowerCase();

  if (SHOPIFY_WORKBOOK_LABELS.has(normalized)) {
    return {
      warehouse: SHOPIFY_WAREHOUSE_NAME,
      header: SHOPIFY_WAREHOUSE_NAME,
      column: "",
      components: [...SHOPIFY_WAREHOUSE_COMPONENTS],
    };
  }

  const exactSummary =
    summaryColumns.find(
      (item) => item.warehouse.toLowerCase() === normalized || item.header.toLowerCase() === normalized
    ) || null;
  if (exactSummary) {
    return { ...exactSummary, components: [] };
  }

  const exactWarehouse =
    warehouseColumns.find(
      (item) => item.warehouse.toLowerCase() === normalized || item.header.toLowerCase() === normalized
    ) || warehouseColumns.find((item) => item.warehouse.toLowerCase().includes("pagina web")) || warehouseColumns[0];

  return {
    warehouse: exactWarehouse.warehouse,
    header: exactWarehouse.header,
    column: exactWarehouse.column,
    components: [],
  };
}

export function mergeWorkbookStock(
  warehouseColumns: WorkbookWarehouseColumn[],
  stockFromWarehouses: Record<string, number>,
  summaryOverrides: Record<string, number>
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const column of warehouseColumns) {
    const override = summaryOverrides[column.warehouse];
    out[column.warehouse] = Number.isFinite(override) ? override : Number(stockFromWarehouses[column.warehouse] || 0);
  }
  return out;
}

export function resolveWorkbookSelectedQuantity(
  stockByWarehouse: Record<string, number>,
  selection: WorkbookWarehouseSelection
): number {
  if (selection.components.length) {
    return resolveSelectedInventoryQuantity(stockByWarehouse, selection.warehouse);
  }
  return Number(stockByWarehouse[selection.warehouse] || 0);
}

export function buildPreparedWorkbookSummary(input: {
  sourceFile: string;
  sheet: string;
  selection: WorkbookWarehouseSelection;
  warehouseColumns: WorkbookWarehouseColumn[];
  totalSheetRows: number;
  parentRows: number;
  distinctReferences: number;
  rows: PreparedInventoryWorkbookRow[];
}): PreparedInventoryWorkbookSummary {
  const rows = input.rows;
  return {
    sourceFile: input.sourceFile,
    sheet: input.sheet,
    selectedWarehouse: input.selection.warehouse,
    selectedWarehouseComponents: [...input.selection.components],
    warehouseColumns: input.warehouseColumns.map((item) => item.warehouse),
    totalSheetRows: input.totalSheetRows,
    parentRows: input.parentRows,
    variantRows: rows.length,
    distinctReferences: input.distinctReferences,
    visibleVariants: rows.filter((row) => row.visibleInStore).length,
    variantsWithSelectedStock: rows.filter((row) => row.selectedQuantity > 0).length,
    variantsWithAnyStock: rows.filter((row) => row.totalQuantity > 0).length,
    readyForShopify: rows.filter((row) => row.reference && row.visibleInStore).length,
    readyForShopifyWithSelectedStock: rows.filter((row) => row.reference && row.visibleInStore && row.selectedQuantity > 0)
      .length,
  };
}
