import fs from "fs";
import path from "path";
import zlib from "zlib";

import {
  buildPreparedWorkbookSummary,
  mergeWorkbookStock,
  resolveWorkbookSelectedQuantity,
  resolveWorkbookWarehouseSelection,
  SUMMARY_WAREHOUSE_ALIASES,
} from "../../packages/domain/src";
import type {
  PreparedInventoryWorkbookRow,
  PreparedInventoryWorkbookSummary,
  WorkbookWarehouseColumn,
} from "../../packages/shared/src";

type WorkbookEntries = Record<string, string>;

type WorkbookSheet = {
  name?: string;
  "r:id"?: string;
};

type WorkbookRow = {
  rowNumber: number;
  cells: Record<string, string>;
};

type LoadedWorkbook = {
  entries: WorkbookEntries;
  workbookSheets: WorkbookSheet[];
  relById: Map<string, string>;
  sharedStrings: string[];
};

type PrepareInventoryWorkbookOptions = {
  sheet?: string;
  warehouse?: string;
};

type PreparedWorkbookResult = {
  prepared: PreparedInventoryWorkbookRow[];
  summary: PreparedInventoryWorkbookSummary;
};

type OutputPaths = {
  baseDir: string;
  jsonPath: string;
  csvPath: string;
  summaryPath: string;
};

const WORKBOOK_PATTERN = /^Actualizacion Precios e Inventarios 29abr26.*\.xlsx$/i;

function unzipEntries(buffer: Buffer): WorkbookEntries {
  const entries: WorkbookEntries = {};
  let offset = 0;
  while (offset < buffer.length - 4) {
    if (buffer.readUInt32LE(offset) !== 0x04034b50) break;
    const compressionMethod = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const fileNameLength = buffer.readUInt16LE(offset + 26);
    const extraFieldLength = buffer.readUInt16LE(offset + 28);
    const fileName = buffer.slice(offset + 30, offset + 30 + fileNameLength).toString("utf8");
    const dataStart = offset + 30 + fileNameLength + extraFieldLength;
    const compressed = buffer.slice(dataStart, dataStart + compressedSize);
    let raw: Buffer;
    if (compressionMethod === 0) {
      raw = compressed;
    } else if (compressionMethod === 8) {
      raw = zlib.inflateRawSync(compressed);
    } else {
      throw new Error(`ZIP compression method not supported: ${compressionMethod}`);
    }
    entries[fileName] = raw.toString("utf8");
    offset = dataStart + compressedSize;
  }
  return entries;
}

function xmlText(content: string): string {
  return String(content || "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function parseSharedStrings(xml: string): string[] {
  const values: string[] = [];
  for (const match of xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
    values.push(xmlText(match[1] || ""));
  }
  return values;
}

function parseAttributes(fragment: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const match of fragment.matchAll(/([\w:.-]+)="([^"]*)"/g)) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

function columnFromRef(ref: string): string {
  const match = /^[A-Z]+/.exec(String(ref || ""));
  return match ? match[0] : "";
}

function cellValue(cellXml: string, sharedStrings: string[]): string {
  const openTag = cellXml.match(/<c\b([^>]*)>/);
  const attrs = openTag ? parseAttributes(openTag[1] || "") : {};
  const raw = (cellXml.match(/<v>([\s\S]*?)<\/v>/) || [])[1] || "";
  if (attrs.t === "s") {
    const index = Number(raw);
    return Number.isInteger(index) ? sharedStrings[index] || "" : "";
  }
  return raw;
}

function loadWorkbook(filePath: string): LoadedWorkbook {
  const entries = unzipEntries(fs.readFileSync(filePath));
  const workbookXml = entries["xl/workbook.xml"];
  if (!workbookXml) throw new Error("No se pudo leer xl/workbook.xml");
  const workbookSheets = [...workbookXml.matchAll(/<sheet\b([^>]*)\/>/g)].map((match) =>
    parseAttributes(match[1] || "")
  );
  const relsXml = entries["xl/_rels/workbook.xml.rels"];
  if (!relsXml) throw new Error("No se pudo leer xl/_rels/workbook.xml.rels");
  const rels = [...relsXml.matchAll(/<Relationship\b([^>]*)\/>/g)].map((match) =>
    parseAttributes(match[1] || "")
  );
  const relById = new Map(rels.map((rel) => [String(rel.Id || ""), String(rel.Target || "")]));
  const sharedStringsXml = entries["xl/sharedStrings.xml"];
  const sharedStrings = sharedStringsXml ? parseSharedStrings(sharedStringsXml) : [];
  return { entries, workbookSheets, relById, sharedStrings };
}

function loadSheetRows(workbook: LoadedWorkbook, sheetName: string): WorkbookRow[] {
  const sheet = workbook.workbookSheets.find((item) => item.name === sheetName);
  if (!sheet) {
    const available = workbook.workbookSheets.map((item) => item.name).join(", ");
    throw new Error(`Hoja "${sheetName}" no encontrada. Hojas disponibles: ${available}`);
  }
  const target = workbook.relById.get(String(sheet["r:id"] || ""));
  if (!target) throw new Error(`No se encontro rel para la hoja "${sheetName}"`);
  const worksheetXml = workbook.entries[`xl/${target.replace(/^\//, "")}`];
  if (!worksheetXml) throw new Error(`No se pudo leer la hoja "${sheetName}"`);

  const rows: WorkbookRow[] = [];
  for (const rowMatch of worksheetXml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
    const rowAttrs = parseAttributes(rowMatch[1] || "");
    const cells: Record<string, string> = {};
    for (const cellMatch of (rowMatch[2] || "").matchAll(/<c\b[\s\S]*?<\/c>/g)) {
      const cellXml = cellMatch[0];
      const cellAttrs = parseAttributes((cellXml.match(/<c\b([^>]*)>/) || [])[1] || "");
      const col = columnFromRef(cellAttrs.r || "");
      cells[col] = cellValue(cellXml, workbook.sharedStrings);
    }
    rows.push({
      rowNumber: Number(rowAttrs.r || rows.length + 1),
      cells,
    });
  }
  return rows;
}

function normalizeHeaderMap(headerRow: WorkbookRow) {
  const byColumn: Record<string, string> = {};
  const byHeader: Record<string, string> = {};
  for (const [column, value] of Object.entries(headerRow.cells)) {
    const header = String(value || "").trim();
    if (!header) continue;
    byColumn[column] = header;
    byHeader[header] = column;
  }
  return { byColumn, byHeader };
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const text = String(value || "").trim();
  if (!text) return 0;
  let normalized = text;
  if (normalized.includes(",") && normalized.includes(".")) {
    normalized =
      normalized.lastIndexOf(",") > normalized.lastIndexOf(".")
        ? normalized.replace(/\./g, "").replace(",", ".")
        : normalized.replace(/,/g, "");
  } else if (normalized.includes(",")) {
    normalized = normalized.replace(",", ".");
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toBoolean(value: unknown): boolean {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return false;
  return ["si", "sí", "true", "1", "yes", "y"].includes(text);
}

function csvEscape(value: unknown): string {
  const text = String(value == null ? "" : value);
  if (/["\n,]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildOutputPaths(filePath: string, outDir?: string): OutputPaths {
  const parsed = path.parse(filePath);
  const baseDir = outDir ? path.resolve(outDir) : path.join(parsed.dir, "Descargas", "preparados-shopify");
  fs.mkdirSync(baseDir, { recursive: true });
  const stem = parsed.name.replace(/[^\w.-]+/g, "_");
  return {
    baseDir,
    jsonPath: path.join(baseDir, `${stem}.prepared.json`),
    csvPath: path.join(baseDir, `${stem}.prepared.csv`),
    summaryPath: path.join(baseDir, `${stem}.summary.json`),
  };
}

export function findDefaultWorkbook(): string {
  const roots = [process.cwd(), path.join(process.cwd(), "Descargas")];
  const candidates: Array<{ fullPath: string; mtimeMs: number }> = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (!WORKBOOK_PATTERN.test(entry.name)) continue;
      const fullPath = path.join(root, entry.name);
      const stat = fs.statSync(fullPath);
      candidates.push({ fullPath, mtimeMs: stat.mtimeMs });
    }
  }
  candidates.sort((left, right) => right.mtimeMs - left.mtimeMs);
  return candidates[0]?.fullPath || "";
}

export function prepareInventoryWorkbook(filePath: string, options: PrepareInventoryWorkbookOptions = {}): PreparedWorkbookResult {
  const workbook = loadWorkbook(filePath);
  const sheet = String(options.sheet || "item").trim() || "item";
  const warehouseName = String(options.warehouse || "Bodega Pagina Web").trim() || "Bodega Pagina Web";
  const rows = loadSheetRows(workbook, sheet);
  if (!rows.length) throw new Error(`La hoja "${sheet}" esta vacia`);

  const headers = normalizeHeaderMap(rows[0]);
  const required = ["Codigo", "Nombre", "Referencia"];
  const missing = required.filter((header) => !headers.byHeader[header]);
  if (missing.length) {
    throw new Error(`Faltan columnas requeridas: ${missing.join(", ")}`);
  }

  const warehouseColumns: WorkbookWarehouseColumn[] = Object.entries(headers.byHeader)
    .filter(([header]) => header.startsWith("Cantidad inicial en bodega: "))
    .map(([header, column]) => ({
      header,
      column,
      warehouse: header.replace("Cantidad inicial en bodega: ", "").trim(),
    }));

  if (!warehouseColumns.length) {
    throw new Error("No se encontraron columnas de stock por bodega");
  }

  const summaryColumns: WorkbookWarehouseColumn[] = SUMMARY_WAREHOUSE_ALIASES.filter(
    (item) => headers.byHeader[item.header]
  ).map((item) => ({
    header: item.header,
    column: headers.byHeader[item.header] || "",
    warehouse: item.warehouse,
  }));
  const summaryTotalColumn = headers.byHeader["Inventario Total"] || "";
  const selection = resolveWorkbookWarehouseSelection(warehouseName, warehouseColumns, summaryColumns);

  const prepared: PreparedInventoryWorkbookRow[] = [];
  const distinctReferences = new Set<string>();
  let parentRows = 0;

  for (const row of rows.slice(1)) {
    const get = (header: string) => row.cells[headers.byHeader[header] || ""] || "";
    const code = String(get("Codigo") || "").trim();
    const name = String(get("Nombre") || "").trim();
    const reference = String(get("Referencia") || "").trim();
    if (!name && !reference) continue;

    const isVariant = /\s\/\s/.test(name);
    if (!isVariant) {
      parentRows += 1;
      continue;
    }

    distinctReferences.add(reference);
    const [parentName, variantLabelRaw] = name.split(/\s\/\s/, 2);
    const variantLabel = String(variantLabelRaw || "").trim();

    const rawWarehouseStock = Object.fromEntries(
      warehouseColumns.map((item) => [item.warehouse, toNumber(row.cells[item.column] || "")])
    );
    const summaryOverrides = Object.fromEntries(
      summaryColumns.map((item) => [item.warehouse, toNumber(row.cells[item.column] || "")])
    );
    const stockByWarehouse = mergeWorkbookStock(warehouseColumns, rawWarehouseStock, summaryOverrides);
    const totalQuantity = summaryTotalColumn
      ? toNumber(row.cells[summaryTotalColumn] || "")
      : Object.values(stockByWarehouse).reduce((sum, qty) => sum + Number(qty || 0), 0);
    const selectedQuantity = resolveWorkbookSelectedQuantity(stockByWarehouse, selection);

    prepared.push({
      rowNumber: row.rowNumber,
      code,
      name,
      parentName: String(parentName || "").trim(),
      variantLabel,
      reference,
      visibleInStore: toBoolean(get("Mostrar item en tienda")),
      hasStockFlag: toBoolean(get("Con Stock?")),
      selectedWarehouse: selection.warehouse,
      selectedQuantity,
      totalQuantity,
      prices: {
        priceWithVat: toNumber(get("Precio con IVA")),
        discountPriceWithVat: toNumber(get("Precio con Dcto con IVA") || get("Precio con Dcto")),
        general: toNumber(get("Precio: General")),
        discountBeforeVat: toNumber(get("Decuento Vigente antes de IVA")),
      },
      stockByWarehouse,
    });
  }

  const summary = buildPreparedWorkbookSummary({
    sourceFile: filePath,
    sheet,
    selection,
    warehouseColumns,
    totalSheetRows: Math.max(0, rows.length - 1),
    parentRows,
    distinctReferences: distinctReferences.size,
    rows: prepared,
  });

  return { prepared, summary };
}

export function writePreparedOutputs(
  filePath: string,
  prepared: PreparedInventoryWorkbookRow[],
  summary: PreparedInventoryWorkbookSummary,
  outDir?: string
): OutputPaths {
  const outputPaths = buildOutputPaths(filePath, outDir);
  const csvHeaders = [
    "rowNumber",
    "code",
    "reference",
    "parentName",
    "variantLabel",
    "name",
    "visibleInStore",
    "hasStockFlag",
    "selectedWarehouse",
    "selectedQuantity",
    "totalQuantity",
    "priceWithVat",
    "discountPriceWithVat",
    "generalPrice",
    "discountBeforeVat",
  ];

  const csvLines = [csvHeaders.join(",")];
  for (const item of prepared) {
    csvLines.push(
      [
        item.rowNumber,
        item.code,
        item.reference,
        item.parentName,
        item.variantLabel,
        item.name,
        item.visibleInStore ? "true" : "false",
        item.hasStockFlag ? "true" : "false",
        item.selectedWarehouse,
        item.selectedQuantity,
        item.totalQuantity,
        item.prices.priceWithVat,
        item.prices.discountPriceWithVat,
        item.prices.general,
        item.prices.discountBeforeVat,
      ]
        .map(csvEscape)
        .join(",")
    );
  }

  fs.writeFileSync(outputPaths.jsonPath, JSON.stringify(prepared, null, 2));
  fs.writeFileSync(outputPaths.summaryPath, JSON.stringify(summary, null, 2));
  fs.writeFileSync(outputPaths.csvPath, `${csvLines.join("\n")}\n`);

  return outputPaths;
}
